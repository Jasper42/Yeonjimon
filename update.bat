@echo off

echo Updating the bot from GitHub...
git pull origin main
echo Bot updated successfully!

echo Installing dependencies...
npm install
echo Dependencies installed successfully!

pause
