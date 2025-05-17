YEONJIMON Discord Bot
==========================

A fun Discord bot to play with! This guide will help you set up and run the bot on your PC.

Requirements
------------

*   [Node.js](https://nodejs.org/en/download/) (LTS version recommended)
*   [Git](https://git-scm.com/downloads) 

Installation
------------

### Download or Clone the Bot Repository

You can download the bot repository as a ZIP file or clone it using Git.

#### Using Git:

bash
git clone https://github.com/Jasper42/yeonjimon.git

#### Using ZIP:

Download the ZIP file from the repository.
Extract the contents to a folder on your PC.

Open the Bot Folder
-------------------

Right-click inside the folder and select "Open in Terminal" or open your terminal and navigate to the folder.

Install Dependencies
-------------------

open cmd in your yeonjimon folder and enter:
npm install

Create the .env File
-------------------

Create a new file named .env using the .env.template in the bot folder.
Add your Discord bot token and other required environment variables to the file.

### Example .env File:

```
# makefile
TOKEN=your-discord-bot-token-here
GUILD_ID=your-server-id-here
LEFTRIGHT_ID=your-channel-id-here

Running the Bot
--------------

### Double-Click run.bat

Double-click the run.bat file to start the bot.
A console window will open showing the bot's status.

### To Stop the Bot

Simply close the console window or press any key if prompted.

Updating the Bot
--------------

### Using update.bat

Double-click the update.bat file to update the bot to the latest version from GitHub.
The bot will pull changes from the repository and recompile the code.

Troubleshooting
---------------

*   Ensure Node.js is installed and added to your system PATH.
*   Confirm your .env file is correctly configured with your bot token.
*   If the bot fails to start, check the console window for error messages.


