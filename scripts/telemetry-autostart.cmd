@echo off
rem ai-playbook telemetry collector 自启包装（Task Scheduler ONLOGON 调用）
cd /d C:\projects\ai-playbook
start "" /b node telemetry\collector.mjs >> telemetry\collector.log 2>&1
