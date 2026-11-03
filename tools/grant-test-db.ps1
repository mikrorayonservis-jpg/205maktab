#Requires -RunAsAdministrator
# Test bazasi (db_school_test) ucun school_app istifadecisine icaze verir.
# Root parolu bilinmeden isleyir: MySQL bir defe --init-file ile acilir.
# Istifade (Administrator PowerShell):  powershell -ExecutionPolicy Bypass -File .\tools\grant-test-db.ps1

$ErrorActionPreference = "Stop"
$bin  = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$ini  = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
$data = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
$init = Join-Path $env:TEMP "q205-mysql-init.sql"
$log  = Join-Path $env:TEMP "q205-mysqld.log"

if (-not (Test-Path "$bin\mysqld.exe")) { Write-Host "mysqld.exe tapilmadi: $bin" -ForegroundColor Red; exit 1 }

$sql = "CREATE DATABASE IF NOT EXISTS db_school_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`r`nGRANT ALL PRIVILEGES ON db_school_test.* TO 'school_app'@'localhost';`r`n"

$reset = Read-Host "Root parolunu da yenilemek isteyirsiniz? (b = beli, Enter = xeyr)"
if ($reset -eq "b") {
  $sec = Read-Host "Yeni root parolu" -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  if ($plain.Length -lt 8) { Write-Host "Parol en azi 8 simvol olmalidir." -ForegroundColor Red; exit 1 }
  $esc = $plain.Replace("\", "\\").Replace("'", "''")
  $sql += "ALTER USER 'root'@'localhost' IDENTIFIED BY '$esc';`r`n"
}

try {
  Set-Content -Path $init -Value $sql -Encoding ascii

  Write-Host "1/4 MySQL dayandirilir..."
  $svc = Get-Service -Name MySQL84 -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq "Running") { Stop-Service -Name MySQL84 }
  Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 3

  Write-Host "2/4 MySQL icaze faylı ile acilir..."
  if (Test-Path $ini) { $first = "--defaults-file=`"$ini`"" } else { $first = "--datadir=`"$data`"" }
  Remove-Item $log, "$log.out" -ErrorAction SilentlyContinue
  $p = Start-Process -FilePath "$bin\mysqld.exe" -ArgumentList @($first, "--init-file=`"$init`"", "--console") `
        -RedirectStandardError $log -RedirectStandardOutput "$log.out" -PassThru -WindowStyle Hidden

  $ready = $false
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
    if ($text -match "ready for connections") { $ready = $true; break }
    if ($p.HasExited) { break }
  }
  Start-Sleep -Seconds 2

  Write-Host "3/4 Muveqqeti MySQL dayandirilir..."
  if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
  Start-Sleep -Seconds 3

  if (-not $ready) {
    Write-Host "MySQL init faylı ile acila bilmedi. Jurnal:" -ForegroundColor Red
    Get-Content $log -Tail 30
  } else {
    $text = Get-Content $log -Raw
    if ($text -match "init_file|init file" -and $text -match "\[ERROR\]") {
      Write-Host "Init faylinda xeta oldu:" -ForegroundColor Red
      Get-Content $log | Select-String "ERROR"
    } else {
      Write-Host "Icaze verildi." -ForegroundColor Green
    }
  }
}
finally {
  Remove-Item $init -ErrorAction SilentlyContinue
  Write-Host "4/4 MySQL normal rejimde baslanir..."
  $svc = Get-Service -Name MySQL84 -ErrorAction SilentlyContinue
  if ($svc) { Start-Service -Name MySQL84; Write-Host "MySQL84 xidmeti isleyir." -ForegroundColor Green }
  else { Write-Host "MySQL84 xidmeti yoxdur - MySQL-i evvelki kimi mysql_start.bat ile isle salin." -ForegroundColor Yellow }
}
