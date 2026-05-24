@echo off
setlocal

echo CorpseReaper - Prepare Zombie Prune
echo.
set /p SLOT=Enter save slot, e.g. savegame_1: 
if "%SLOT%"=="" (
  echo Cancelled.
  pause
  exit /b 1
)

call "%~dp0Start_CorpseReaper.cmd" --prepare-prune "%SLOT%"
