# Registers narrate-server as a Windows logon task (runs at sign-in).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File "$(scoop prefix narrate)\install-service.ps1"
#
# Notes:
# - Creates task "narrate-server" under the current user.
# - Safe to re-run: schtasks overwrites the task definition.
# - The task runs narrate-server.cmd which resolves relative to the scoop
#   install dir (%~dp0), so scoop updates don't break the shim.
# - If the server later fails to start, check:  schtasks /query /tn narrate-server /v

$ErrorActionPreference = "Stop"

$scoopDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverCmd = Join-Path $scoopDir "narrate-server.cmd"

if (-not (Test-Path $serverCmd)) {
    Write-Error "narrate-server.cmd not found at $serverCmd - is narrate installed via scoop?"
    exit 1
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$serverCmd`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 0)

Register-ScheduledTask -TaskName "narrate-server" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "✅ Registered 'narrate-server' logon task: $serverCmd"
Write-Host "   Remove with:  schtasks /delete /tn narrate-server /f"
