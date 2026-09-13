@echo off
REM Antigravity(agy) PreToolUse 启动器（v5.0 WS3）
REM 用法：guard.cmd <guard-a> [guard-b ...]
REM agy 在 Windows 上经 cmd /c 执行 hook 命令，且 cwd = hooks.json 所在目录；
REM 这里用 %~dp0 自定位回溯到仓库根，避免依赖 cwd 约定（SPIKES-2026-09 spike-6）。
REM stdin（camelCase payload）由 cmd 透传给 node。
node "%~dp0..\..\.claude\hooks\engine\group.mjs" agy %*
exit /b %ERRORLEVEL%
