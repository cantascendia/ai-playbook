#!/usr/bin/env node
// telemetry/collector.mjs — 零依赖 OTLP/JSON 接收器（Claude Code 本地用量看板）
//
// Claude Code 开启遥测后（CLAUDE_CODE_ENABLE_TELEMETRY=1 + OTLP http/json exporter）
// 会把 metrics POST 到 {endpoint}/v1/metrics、logs POST 到 {endpoint}/v1/logs。
// 本进程是一个 node:http server，把每个 datapoint / logRecord 拍平成一行 JSONL，
// 落到 <dataDir>/metrics-<YYYY-MM-DD>.jsonl 和 events-<YYYY-MM-DD>.jsonl。
//
// 设计原则（铁律 #2/#9）：只记录真实收到的字段，缺失维度不编造。
//
// 用法：
//   node telemetry/collector.mjs
//   TELEMETRY_PORT=41818 TELEMETRY_DATA_DIR=/tmp/x node telemetry/collector.mjs
//
// 环境变量：
//   TELEMETRY_PORT       监听端口（默认 4318，对齐 OTLP http 默认）
//   TELEMETRY_DATA_DIR   JSONL 落盘目录（默认 <此文件同级>/data）
//   TELEMETRY_HOST       监听地址（默认 127.0.0.1，仅本地）

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.TELEMETRY_PORT || 4318);
const HOST = process.env.TELEMETRY_HOST || '127.0.0.1';
const DATA_DIR = process.env.TELEMETRY_DATA_DIR || path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- OTLP JSON helpers ----

// 把 OTLP AnyValue（{stringValue|intValue|doubleValue|boolValue|arrayValue|...}）取成 JS 原生值。
function anyValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('intValue' in v) return typeof v.intValue === 'string' ? Number(v.intValue) : v.intValue;
  if ('doubleValue' in v) return v.doubleValue;
  if ('boolValue' in v) return v.boolValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(anyValue);
  if ('kvlistValue' in v) return attrsToObj(v.kvlistValue.values || []);
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}

// OTLP KeyValue[] -> 普通对象 {key: value}
function attrsToObj(attrs) {
  const out = {};
  for (const a of attrs || []) {
    if (a && typeof a.key === 'string') out[a.key] = anyValue(a.value);
  }
  return out;
}

// nanoseconds（字符串或数字）-> ISO 时间戳；无则用当前时间
function nanoToIso(nano) {
  if (nano == null) return new Date().toISOString();
  const n = typeof nano === 'string' ? Number(nano) : nano;
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
  return new Date(n / 1e6).toISOString();
}

function dayFile(prefix) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(DATA_DIR, `${prefix}-${day}.jsonl`);
}

function appendLines(file, lines) {
  if (!lines.length) return;
  fs.appendFileSync(file, lines.map((l) => JSON.stringify(l) + '\n').join(''));
}

// ---- Metrics: resourceMetrics[].scopeMetrics[].metrics[] ----

function flattenMetrics(body) {
  const rows = [];
  for (const rm of body.resourceMetrics || []) {
    const resource = attrsToObj(rm.resource && rm.resource.attributes);
    for (const sm of rm.scopeMetrics || []) {
      for (const m of sm.metrics || []) {
        const unit = m.unit || '';
        // metric 数据可能挂在 sum / gauge / histogram 下
        const container = m.sum || m.gauge || m.histogram || m.exponentialHistogram || m.summary;
        const dps = (container && container.dataPoints) || [];
        for (const dp of dps) {
          let value = null;
          if ('asInt' in dp) value = typeof dp.asInt === 'string' ? Number(dp.asInt) : dp.asInt;
          else if ('asDouble' in dp) value = dp.asDouble;
          else if ('sum' in dp) value = dp.sum; // histogram summary count/sum fallback
          rows.push({
            ts: nanoToIso(dp.timeUnixNano || dp.startTimeUnixNano),
            metric: m.name,
            value,
            unit,
            attrs: attrsToObj(dp.attributes),
            resource,
          });
        }
      }
    }
  }
  return rows;
}

// ---- Logs: resourceLogs[].scopeLogs[].logRecords[] ----

function flattenLogs(body) {
  const rows = [];
  for (const rl of body.resourceLogs || []) {
    const resource = attrsToObj(rl.resource && rl.resource.attributes);
    for (const sl of rl.scopeLogs || []) {
      for (const lr of sl.logRecords || []) {
        rows.push({
          ts: nanoToIso(lr.timeUnixNano || lr.observedTimeUnixNano),
          event: (lr.attributes || []).length
            ? (attrsToObj(lr.attributes)['event.name'] || lr.severityText || 'log')
            : (lr.severityText || 'log'),
          severity: lr.severityText || '',
          body: lr.body ? anyValue(lr.body) : null,
          attrs: attrsToObj(lr.attributes),
          resource,
        });
      }
    }
  }
  return rows;
}

// ---- HTTP server ----

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 32 * 1024 * 1024) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }

    if (req.method === 'POST' && (req.url === '/v1/metrics' || req.url === '/v1/logs')) {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
        return;
      }
      let rows;
      let prefix;
      if (req.url === '/v1/metrics') {
        rows = flattenMetrics(body);
        prefix = 'metrics';
      } else {
        rows = flattenLogs(body);
        prefix = 'events';
      }
      try {
        appendLines(dayFile(prefix), rows);
      } catch (e) {
        console.error(`[collector] write error: ${e.message}`);
      }
      console.log(`[collector] ${req.url} ${rows.length} datapoints -> ${prefix}`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (e) {
    // 任何未预期错误都不能让 server 崩溃
    console.error(`[collector] handler error: ${e && e.message}`);
    try {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad request' }));
    } catch {
      /* response 已发出，忽略 */
    }
  }
});

server.on('clientError', (err, socket) => {
  try {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  } catch {
    /* ignore */
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[collector] listening http://${HOST}:${PORT} -> ${DATA_DIR}`);
  console.log('[collector] POST /v1/metrics  POST /v1/logs  GET /healthz');
});

function shutdown(sig) {
  console.log(`[collector] ${sig} received, shutting down`);
  server.close(() => process.exit(0));
  // 兜底：2s 内没关干净就强退
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
