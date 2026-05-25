# run_all.ps1 — Windows wrapper for metric pulls.
#
# Wire this into Task Scheduler for a 6-hour cadence:
#   schtasks /create /tn "My Metrics Pull" `
#     /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\.claude\skills\metrics-pull\scripts\run_all.ps1" `
#     /sc HOURLY /mo 6 /ru "$env:USERNAME"
#
# Designed to never throw — scheduler should never see a failure even if every
# source dies. Per-source errors are captured to the log + the pull script's
# own last-pull.json status.

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path (Split-Path -Parent $ScriptDir) "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Ts = (Get-Date).ToString("yyyy-MM-ddTHH-mm-ss")
$LogFile = Join-Path $LogDir "run-$Ts.log"

"=== metrics pull run started $Ts ===" | Out-File -FilePath $LogFile -Encoding utf8

# Discover every pull_*.py in the scripts directory and fire them in parallel.
$Scripts = Get-ChildItem -Path $ScriptDir -Filter "pull_*.py" -File

if ($Scripts.Count -eq 0) {
    "No pull_*.py scripts found in $ScriptDir — nothing to do." |
        Out-File -FilePath $LogFile -Append -Encoding utf8
    exit 0
}

$Jobs = @()
foreach ($Script in $Scripts) {
    $Jobs += Start-Job -ArgumentList $Script.FullName -ScriptBlock {
        param($scriptPath)
        try {
            python $scriptPath 2>&1
        } catch {
            "ERROR: $($_.Exception.Message)"
        }
    }
}

# 90s aggregate timeout — sources should take seconds, not minutes.
$Timeout = 90
Wait-Job -Job $Jobs -Timeout $Timeout | Out-Null

foreach ($Job in $Jobs) {
    $State = $Job.State
    "--- job $($Job.Id) state=$State ---" | Out-File -FilePath $LogFile -Append -Encoding utf8
    if ($State -eq "Running") {
        Stop-Job -Job $Job
        "(stopped due to 90s timeout)" | Out-File -FilePath $LogFile -Append -Encoding utf8
    }
    Receive-Job -Job $Job 2>&1 | Out-File -FilePath $LogFile -Append -Encoding utf8
    Remove-Job -Job $Job -Force
}

"=== run finished $((Get-Date).ToString('yyyy-MM-ddTHH-mm-ss')) — $($Scripts.Count) sources ===" |
    Out-File -FilePath $LogFile -Append -Encoding utf8
exit 0
