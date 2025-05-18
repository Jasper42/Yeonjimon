@echo off

echo ========================================
echo Updating the bot from GitHub...
echo ========================================
git pull origin main
echo Bot updated successfully!

echo ========================================
echo Installing dependencies...
echo ========================================
npm install
echo Dependencies installed successfully!

echo ========================================
echo Building the bot with new updates...
echo ========================================
npm run build
echo Bot built successfully!

pause
