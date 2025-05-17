@echo off
echo Updating the bot from GitHub...
git pull origin main
npm run build
echo Bot updated to latest version.
pause