@echo off
chcp 65001 >nul
rem Tam yoxlama: asılılıqlar, miqrasiyalar, typecheck, unit testlər, build, inteqrasiya testləri.
rem Nəticə: test-results\verify-log.txt
cd /d "%~dp0\.."
if not exist test-results mkdir test-results
(
  echo === %DATE% %TIME%
  node -v
  call npm install
  call npm run db:migrate
  call npm run verify
  echo === EXIT %ERRORLEVEL%
) > test-results\verify-log.txt 2>&1
type test-results\verify-log.txt | more
pause
