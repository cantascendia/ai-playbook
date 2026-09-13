@echo off
REM Codex PreToolUse — 文件类 / apply_patch（v5.0 WS2）
REM apply_patch 的目标路径藏在 patch 文本里，由 engine 的 guard.mjs 解析后扇出为逐文件判定。
node "%~dp0..\..\.claude\hooks\engine\group.mjs" codex immutable-guard forbidden-guard branch-guard test-lock-guard
exit /b %ERRORLEVEL%
