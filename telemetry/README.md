# telemetry — Claude Code 本地用量看板

零依赖 Node（v22 / ESM `.mjs`，无需 `npm install`）的**本地** OpenTelemetry 接收器 + 报表工具，
用于观测 Claude Code 的 token / 成本 / 会话用量，可按 **仓库（repo）/ 模型（model）/ 会话** 等维度聚合。

- `collector.mjs` — `node:http` server，接收 Claude Code 导出的 OTLP/JSON metrics 与 logs，
  拍平成 JSONL 落盘到 `telemetry/data/`。
- `report.mjs` — 读 `telemetry/data/*.jsonl`，按维度聚合出终端表格（可选 HTML）。
- `data/` — JSONL 落盘目录（`.gitignore` 已排除，不入库）。

---

## 1. 它是什么 / 数据从哪来

Claude Code 在开启遥测后，会通过 OpenTelemetry SDK 周期性地把用量指标 POST 到
`{OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`（logs 走 `/v1/logs`），Content-Type `application/json`。
`collector.mjs` 就是这个 endpoint 的最小实现：把每个 metric datapoint 拍平成一行 JSONL：

```json
{"ts":"2026-07-10T12:00:00.000Z","metric":"claude_code.token.usage","value":123,"unit":"tokens","attrs":{"type":"input","model":"claude-opus-4-8"},"resource":{"repo":"ai-playbook","session.id":"..."}}
```

关注的关键指标：

| 指标 | 含义 | 关键属性 |
|---|---|---|
| `claude_code.token.usage` | token 数 | `type`=input\|output\|cacheRead\|cacheCreation, `model` |
| `claude_code.cost.usage` | 估算成本（USD） | `model` |
| `claude_code.session.count` | 会话计数 | — |
| `claude_code.lines_of_code.count` | 代码行数 | — |

---

## 2. 开启遥测（只需改你自己的 `settings.local.json`）

> ⚠️ 本仓不会、也不应替你修改任何真实 `settings.json`。下面是**文档片段**，
> 请你自己把 `env` 块加到 `.claude/settings.local.json`（该文件不入 git）。

```jsonc
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_METRIC_EXPORT_INTERVAL": "5000"
  }
}
```

`OTEL_METRIC_EXPORT_INTERVAL=5000`（5s）适合本地快速看到数据；生产可调大。

---

## 3. 按仓库 / workflow 打标签（repo 维度的来源）

Claude Code **没有内置的 repo / cwd 属性**。要区分不同仓库或不同 CI run，
必须自己通过 `OTEL_RESOURCE_ATTRIBUTES` 注入 —— 这些属性会随
`OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=true`（默认开）流到每个 datapoint 的 `resource`：

本地（按当前仓库名）：

```bash
export OTEL_RESOURCE_ATTRIBUTES="repo=ai-playbook"
```

GitHub Actions 里（顺带带上 workflow run id）：

```yaml
env:
  OTEL_RESOURCE_ATTRIBUTES: "repo=${GITHUB_REPOSITORY},workflow_run_id=${GITHUB_RUN_ID}"
```

report 的维度解析优先读 `resource`，其次 datapoint 属性；**取不到就显示 `(unset)`，绝不编造**。

---

## 4. 运行

启动接收器（默认端口 4318，可用 `TELEMETRY_PORT` 覆盖）：

```bash
node telemetry/collector.mjs
# 自定义端口 / 落盘目录：
TELEMETRY_PORT=41818 TELEMETRY_DATA_DIR=/tmp/tele node telemetry/collector.mjs
```

出报表：

```bash
node telemetry/report.mjs --by repo,model          # 默认 --since 30
node telemetry/report.mjs --by repo,model,session.id --since 7
node telemetry/report.mjs --dims                    # 列出数据里实际出现的维度键
node telemetry/report.mjs --by repo --html usage.html
```

`report.mjs` 参数：

| Flag | 默认 | 说明 |
|---|---|---|
| `--by <dims>` | `repo,model` | 逗号分隔的聚合维度（repo / model / session.id / type / workflow_run_id …） |
| `--since <days>` | `30` | 只看最近 N 天 |
| `--html <file>` | — | 额外输出静态 HTML 表 |
| `--dims` | — | 打印数据里出现过的所有维度键后退出 |

---

## 5. 隐私说明

- **纯本地**：collector 默认只监听 `127.0.0.1`，数据只落到 `telemetry/data/`（已 `.gitignore`，不上传、不入库）。
- `session.id` 默认随 datapoint 上报（Claude Code 默认行为）。若不想记录，可在环境里关闭对应的
  resource 属性上报（`OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=false`），或直接不开遥测。
- 成本为**本地估算，非官方账单**（来自 `claude_code.cost.usage`），仅供趋势参考。

---

## 6. 局限 & 未来工作

- **repo 维度需手动注入**：如上，Claude Code 无内置 cwd/repo 属性，未打 `OTEL_RESOURCE_ATTRIBUTES`
  的数据 repo 维度会显示 `(unset)`。这是诚实的缺失，不是 bug。
- **回填（未实现）**：`~/.claude/` 下的会话 transcript JSONL 也含 token 用量，理论上可作为历史回填源；
  但其 schema 未版本化、随版本变动，风险较高，**此处仅记录为未来工作，当前不实现**。
- collector 是单进程本地工具，非生产级 OTLP collector（无鉴权 / 无采样 / 无 gRPC）。
  需要生产可观测性请接标准 OTel Collector + Prometheus/Grafana。
