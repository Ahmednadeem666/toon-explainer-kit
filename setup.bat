@echo off
REM Toon Kit setup (Windows). Double-click once.
cd /d "%~dp0"
where node >nul 2>nul || (echo [setup] Node.js not found. Run: winget install OpenJS.NodeJS.LTS & pause & exit /b 1)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (echo [setup] Need Node 18 or newer & pause & exit /b 1)
where ffmpeg >nul 2>nul || (echo [setup] ffmpeg not found. Run: winget install Gyan.FFmpeg  then reopen this window & pause & exit /b 1)
echo [setup] installing packages + headless Chrome for rendering (~200 MB, one time)...
call npm install --no-fund --no-audit || (echo [setup] npm install failed & pause & exit /b 1)
if not exist .env (copy .env.example .env >nul & echo [setup] created .env - add your ElevenLabs key there)
echo [setup] test render...
node kit\cli.js frame demo s04@3 --out setup-test.png && echo [setup] renderer works - projects\demo\out\setup-test.png
echo.
echo [setup] done. Open this folder in Claude Code and say:  make a video about why the stock market crashed
pause
