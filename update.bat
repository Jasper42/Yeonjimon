@echo off

echo ========================================
echo Updating the bot from GitHub...
echo ========================================
git pull origin main || (
    echo Git pull failed. Exiting...
    pause
    exit /b
)
echo Bot updated to latest version.

echo ========================================
echo Installing dependencies...
echo ========================================
npm install || (
    echo Dependency installation failed. Exiting...
    pause
    exit /b
)
echo Dependencies successfully installed.

echo ========================================
echo Building the bot with new updates...
echo ========================================
npm run build || (
    echo Build failed. Exiting...
    pause
    exit /b
)
echo Build complete.

pause
