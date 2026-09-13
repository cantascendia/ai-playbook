@echo off
REM Codex PreToolUse — MCP 工具（v5.0 WS2）
node "%~dp0..\..\.claude\hooks\engine\group.mjs" codex mcp-guard
exit /b %ERRORLEVEL%
