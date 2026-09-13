@echo off
REM Codex PreToolUse — shell 类（v5.0 WS2）
REM %~dp0 自定位到本文件所在目录，再回溯到仓库根，因此**不依赖 Codex 的 cwd**
REM （SPIKES-2026-09 spike-5 未证实 Codex 的 hook cwd 基准，故不在启动器里假设它）。
node "%~dp0..\..\.claude\hooks\engine\group.mjs" codex bypass-guard destructive-action-guard branch-guard
exit /b %ERRORLEVEL%
