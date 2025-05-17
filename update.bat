@echo off
echo Updating the bot from GitHub...
git pull origin main
npx tsc
echo Bot updated to latest version.
pause