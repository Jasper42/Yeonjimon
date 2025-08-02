# 🤖 Yeonjimon Discord Bot Setup Guide

**Simple 5-step setup**

## ⚡ Quick Start

### Step 1: Install Node.js
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS version** (big green button)
3. Install it (keep clicking "Next")

### Step 2: Download Bot Files
1. Go to [https://github.com/Jasper42/Yeonjimon](https://github.com/Jasper42/Yeonjimon)
2. Click the green **"< > Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to your computer (right-click → Extract All)
5. Open the extracted `Yeonjimon-main` folder

### Step 3: Setup Configuration
1. Copy `.env.template` and rename the copy to just `.env`
2. Open the new `.env` file in Notepad

### Step 4: Configure Your Bot
Fill in these values in your `.env` file:

```
TOKEN=your_discord_bot_token_here
GUILD_ID=your_server_id_here
LEFTRIGHT_ID=your_channel_id_here
POLLINATION_CHANNEL_ID=your_pollination_channel_id_here
LEVEL_CHANNEL_ID=your_level_channel_id_here
ADMIN_USER_IDS=your_user_id_here,another_admin_id_here
```

**📝 .env File Rules:**
- **NO SPACES** around the `=` sign (like `TOKEN=abc123`)
- **NO QUOTES** around values (just `TOKEN=abc123`, not `TOKEN="abc123"`)
- Lines starting with `#` are comments (ignored by bot)
- Each setting goes on its own line

**Need help getting these IDs?** See the [Discord ID Guide](#getting-discord-ids) below.

### Step 5: Run Your Bot
1. Double-click `run.bat`
2. Wait for "Bot is ready!" message
3. Your bot is now online! 🎉

---

## 🔧 Getting Discord IDs

### Bot Token:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → Give it a name
3. Go to "Bot" section → Click "Reset Token"
4. Copy the token and paste it in your `.env` file

### Invite Bot to Your Server:
1. In the same Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Check **"bot"** and **"applications.commands"** under Scopes
3. Under Bot Permissions, check:
   - **Send Messages**
   - **Use Slash Commands** 
   - **Add Reactions**
   - **Attach Files**
   - **Read Message History**
   - **Use External Emojis**
4. Copy the generated URL at the bottom
5. Open the URL in your browser → Select your server → Authorize

### Server ID (GUILD_ID):
1. Right-click your Discord server name
2. Click "Copy Server ID"
3. Paste it in your `.env` file

### Channel IDs:
1. Right-click any channel name
2. Click "Copy Channel ID"
3. Paste it in your `.env` file

### Your User ID (for ADMIN_USER_IDS):
1. Right-click your username in Discord
2. Click "Copy User ID"
3. Paste it in your `.env` file

**Note:** Enable "Developer Mode" in Discord Settings → Advanced if you don't see these options.

---

## 🤖 Getting AI API Keys (Optional)

Your bot can chat with users using AI! You need at least one API key:

### Groq API Key (Recommended - Free):
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up with Google/GitHub account
3. Go to "API Keys" section
4. Click "Create API Key" → Give it a name
5. Copy the key and paste it as `groq_api_key` in your `.env` file

### Gemini API Key (Backup - Free):
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key and paste it as `gemini_api_key` in your `.env` file

**Note:** You can use both for better reliability, or just one. Set unused keys to `0`.

---

## 🎮 Managing Your Bot

### Start Bot:
Double-click `run.bat`

### Stop Bot:
Close the black window that opens

### Update Bot:
Double-click `update.bat`

### Change Settings:
Edit the `.env` file in Notepad

---

## 🎯 Game Rewards (Optional)

You can change these numbers in your `.env` file:

```
Guess_reward_amount=100          # Points for guessing correctly
ThreeUnique=50                   # Slots game bonus
ThreeMatchReward=100             # Slots jackpot
LemonMultiplier=5                # Lemon bonus multiplier
SlotsCost=10                     # Cost to play slots
```

---

## ❓ Problems?

### Bot won't start?
- Make sure Node.js is installed
- Check your `.env` file has the right token
- Make sure all IDs are correct

### Bot goes offline?
- Don't close the black window
- Check your internet connection
- Restart with `run.bat`

### Need help?
- Check the black window for error messages
- Make sure your bot has permissions in your Discord server

---

**That's it! Your bot should be working now! 🚀**


