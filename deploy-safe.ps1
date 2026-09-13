# Safe deploy script for the resume site (Windows Server / nssm).
# Design: backup first, disable the crash-looping backend service, patch files,
# rebuild frontend, start backend in an interactive session, health-check,
# and roll back automatically if the health check fails.

$ErrorActionPreference = 'Stop'

$root  = 'C:\resume\XuanRuiMu-XuanRuiMuResume-1ab0604'
$nssm  = 'C:\nssm\nssm-2.24\win64\nssm.exe'
$node  = 'C:\Program Files\nodejs\node.exe'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak   = "C:\resume\backup\$stamp"
$log   = "C:\resume\deploy-$stamp.log"
$tmp   = 'C:\resume\tmp'

$b64Url = 'https://h.uguu.se/QTldtcnB.txt'
$envUrl = 'https://d.uguu.se/yZYyMPUj.txt'

function Log($m) {
  $line = (Get-Date -Format 'HH:mm:ss') + ' ' + $m
  Add-Content -Path $log -Value $line -Encoding UTF8
  Write-Output $line
}

function Rollback($reason) {
  Log "ROLLBACK: $reason"
  try { & $nssm stop ResumeBackend | Out-Null } catch {}
  try {
    if (Test-Path "$bak\server") { Copy-Item "$bak\server\*" "$root\server" -Recurse -Force }
    if (Test-Path "$bak\src")    { Copy-Item "$bak\src\*"    "$root\src"    -Recurse -Force }
    if (Test-Path "$bak\dist")   { Copy-Item "$bak\dist\*"   "$root\dist"   -Recurse -Force }
    Log 'rollback copy done'
  } catch { Log ('rollback error: ' + $_.Exception.Message) }
}

try {
  Log '=== deploy start ==='

  # 1) Stop the backend service. It cannot run in Session 0 (Python 3.12 asyncio
  #    raises WinError 10106), and a fast crash loop previously overloaded the box.
  try { & $nssm stop ResumeBackend | Out-Null } catch {}
  sc.exe config ResumeBackend start= disabled | Out-Null
  Start-Sleep -Seconds 2
  Log 'backend service disabled (crash-loop protection)'

  # 2) Backup current state (.venv excluded, it is huge and untouched)
  New-Item -ItemType Directory -Force -Path $bak | Out-Null
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  if (Test-Path "$root\server\app") { Copy-Item "$root\server\app" "$bak\server\app" -Recurse -Force }
  if (Test-Path "$root\server\data") { Copy-Item "$root\server\data" "$bak\server\data" -Recurse -Force }
  if (Test-Path "$root\server\.env") { Copy-Item "$root\server\.env" "$bak\server\.env" -Force }
  if (Test-Path "$root\src") { Copy-Item "$root\src" "$bak\src" -Recurse -Force }
  if (Test-Path "$root\dist") { Copy-Item "$root\dist" "$bak\dist" -Recurse -Force }
  Log "backup -> $bak"

  # 3) Fetch and apply the code patch (zip shipped as base64 text)
  Invoke-WebRequest -Uri $b64Url -OutFile "$tmp\deploy.b64.txt" -UseBasicParsing -TimeoutSec 300
  certutil -decode "$tmp\deploy.b64.txt" "$tmp\deploy.zip" | Out-Null
  Expand-Archive -Path "$tmp\deploy.zip" -DestinationPath $root -Force
  Log 'code patch applied'

  # 4) Apply backend env (siliconflow)
  Invoke-WebRequest -Uri $envUrl -OutFile "$tmp\env.new" -UseBasicParsing -TimeoutSec 120
  Copy-Item "$tmp\env.new" "$root\server\.env" -Force
  Log 'env applied'

  # 5) Rebuild frontend with the public IP as site url
  $env:SITE_URL = 'http://101.42.45.157/'
  Set-Location $root
  $buildOut = & $node "$root\node_modules\astro\bin\astro.mjs" build 2>&1 | Out-String
  Log ('build exit: ' + $LASTEXITCODE)
  if ($LASTEXITCODE -ne 0) { Rollback 'frontend build failed'; throw 'build failed' }
  Log 'frontend rebuilt'

  # 6) Restart frontend service
  & $nssm restart ResumeFrontend | Out-Null
  Start-Sleep -Seconds 8
  Log 'frontend restarted'

  # 7) Start backend in an interactive session (works around Session 0 asyncio bug)
  Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Start-Process -FilePath 'C:\resume\start_backend.bat' -WorkingDirectory "$root\server" -WindowStyle Hidden
  Start-Sleep -Seconds 25

  # 8) Health check
  $ok = $false
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 20
    $ok = ($r.StatusCode -eq 200)
    Log ('health: ' + $r.Content)
  } catch { Log ('health error: ' + $_.Exception.Message) }

  if (-not $ok) { Rollback 'backend health check failed' }
  else { Log '=== deploy OK ===' }

  # 9) Public smoke test through the frontend proxy
  try {
    $c = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1/api/agent/chat/conversations' -ContentType 'application/json' -Body '{"title":"deploy-smoke"}' -TimeoutSec 30
    Log ('proxy conversation id: ' + $c.id)
  } catch { Log ('proxy smoke failed: ' + $_.Exception.Message) }

  Write-Output ('LOG: ' + $log)
} catch {
  Log ('FATAL: ' + $_.Exception.Message)
  Rollback 'fatal error'
  throw
}
