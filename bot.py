import discord
from discord.ext import commands
from discord import app_commands
import json
import sys
import os

try:
    config_file_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_file_path, 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    print("❌ config.json file not found. Make sure it's in the same folder as the bot script.")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"❌ JSON syntax error in config.json:\n{e}")
    sys.exit(1)
except KeyError as e:
    print(f"❌ Missing key in config.json: {e}")
    sys.exit(1)

# DO NOT share this file publicly — it contains your bot token!

TOKEN = config["token"]
GUILD_ID = int(config["guild_id"])
guild = discord.Object(id=GUILD_ID)
leftright = int(config["leftright_id"])
intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="/", intents=intents)
tree = bot.tree

# Store game data per channel
game_sessions = {}

@bot.event
async def on_ready():
    synced = await tree.sync(guild=guild)
    print(f"🔁 Synced {len(synced)} command(s) to guild {GUILD_ID}")
    print(f"🤖 Bot is ready as {bot.user}!")

# /start command
@tree.command(name="start", description="Start a guess-the-idol game", guild=guild)
@app_commands.describe(name="The idol name to guess", limit="Wrong guess limit per user")
async def start(interaction: discord.Interaction, name: str, limit: int):
    channel_id = interaction.channel.id

    if channel_id in game_sessions and game_sessions[channel_id]['active']:
        await interaction.response.send_message("⚠️ A game is already active in this channel!", ephemeral=True)
        return

    game_sessions[channel_id] = {
        "target": name.lower(),
        "limit": limit,
        "active": True,
        "players": {}
    }
    #Old: 
    #await interaction.response.send_message(f"🎮 Guess-the-Idol game started! Guess using `/guess`. You get {limit} tries!")
    #New:
    # First, respond to the command ephemerally
    await interaction.response.send_message(
        f"✅ Game started. {limit} tries.",
        ephemeral=True
    )

    # Then send a public follow-up message to the channel
    await interaction.channel.send(
        f"🎮 Guess-the-Idol game started! Use `/guess` to participate! You have {limit} tries."
    )



# /guess command
@tree.command(name="guess", description="Make a guess", guild=guild)
@app_commands.describe(name="Your guess")
async def guess(interaction: discord.Interaction, name: str):
    channel_id = interaction.channel.id
    user_id = interaction.user.id
    username = interaction.user.mention

    session = game_sessions.get(channel_id)

    if not session or not session['active']:
        await interaction.response.send_message("❌ No active game. Start one with `/start`.", ephemeral=True)
        return

    guesses = session['players'].get(user_id, 0)

    if guesses >= session['limit']:
        await interaction.response.send_message(f"{username}, you're eliminated! ❌", ephemeral=True)
        return

    if name.lower() == session['target']:
        session['active'] = False
        await interaction.response.send_message(f"🎉 {username} guessed right! The idol was **{session['target'].title()}**. Game over!")
        return

    # Wrong guess
    session['players'][user_id] = guesses + 1
    #Old: response = f"❌ {username} guessed wrong! ({session['players'][user_id]} / {session['limit']})"
    #New:
    response = f"❌ {username} guessed **{name}**, but that's not correct! ({session['players'][user_id]} / {session['limit']})"


    if session['players'][user_id] >= session['limit']:
        response += f"\n🚫 {username} has been eliminated!"

    await interaction.response.send_message(response)

# /end command
@tree.command(name="end", description="End the current game", guild=guild)
async def end(interaction: discord.Interaction):
    channel_id = interaction.channel.id
    session = game_sessions.get(channel_id)

    if not session or not session['active']:
        await interaction.response.send_message("No active game to end.", ephemeral=True)
        return

    session['active'] = False
    await interaction.response.send_message("🛑 Game manually ended.")

@bot.event
async def on_message(message):
    # Ignore messages from the bot itself
    if message.author == bot.user:
        return

    # Specify the channel ID you want to monitor
    monitored_channel_id = leftright

    if message.channel.id == leftright:
        # Check if message contains an image
        if message.attachments:
            for attachment in message.attachments:
                if attachment.content_type and attachment.content_type.startswith("image"):
                    try:
                        await message.add_reaction("⬅️")
                        await message.add_reaction("➡️")
                    except discord.errors.Forbidden:
                        print("Missing permissions to add reactions!")

    # Don't forget this line to ensure commands still work
    await bot.process_commands(message)

# Start the bot
bot.run(TOKEN)