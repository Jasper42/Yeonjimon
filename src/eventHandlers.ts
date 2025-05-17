import { Client, Events, TextChannel } from 'discord.js';
import { registerCommands } from './registerCommands';
import config from './config';

interface GameSession {
  target: string;
  limit: number;
  active: boolean;
  players: Record<string, number>;
}

const gameSessions: Record<string, GameSession> = {};

const numberEmoji: Record<number, string> = {
  0: '0️⃣',
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
  10: '🔟'
};

export function setupEventHandlers(client: Client) {
  client.once(Events.ClientReady, async () => {
    if (!client.user) {
      console.error('❌ client.user is undefined!');
      return;
    }

    console.log(`🤖 Logged in as ${client.user.tag}`);
    await registerCommands(client.user.id);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const channelId = interaction.channel?.id;
    const session = channelId ? gameSessions[channelId] : undefined;

    if (interaction.commandName === 'start') {
      const name = interaction.options.getString('name')!.toLowerCase();
      const limit = interaction.options.getInteger('limit') ?? 0;

      if (session?.active) {
        await interaction.reply({ content: '⚠️ A game is already active!', ephemeral: true });
        return;
      }

      if (!channelId) {
        await interaction.reply({ content: '❌ Channel ID is undefined.', ephemeral: true });
        return;
      }

      gameSessions[channelId] = {
        target: name,
        limit,
        active: true,
        players: {}
      };

      await interaction.reply({ content: `✅ Game started with ${limit} tries.`, ephemeral: true });

      const gamePingRoleId = config.gamePingRoleId;
      const textChannel = interaction.channel as TextChannel;
      if (textChannel?.send) {
        if (gamePingRoleId == '0') {
          await textChannel.send(`🎮 Guess-the-Idol game started! Type \`!idolname\` to guess. You have ${limit} tries.`);
        } else {
          await textChannel.send(`🎮 Guess-the-Idol game started! Type \`!idolname\` to guess. You have ${limit} tries. <@${gamePingRoleId}>`);
        }
      }
    }

    else if (interaction.commandName === 'end') {
      if (!session?.active) {
        await interaction.reply({ content: 'No game to end.', ephemeral: true });
        return;
      }
      session.active = false;
      await interaction.reply('🛑 Game ended.');
    }
  });

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // Media reaction feature
    if (message.channel.id === config.LEFTRIGHT_ID && message.attachments.size > 0) {
      for (const [, attachment] of message.attachments) {
        if (attachment.contentType?.startsWith('image') || attachment.contentType?.startsWith('video')) {
          try {
            await message.react('⬅️');
            await message.react('➡️');
          } catch (err) {
            console.error('❌ Could not add reactions:', err);
          }
        }
      }
    }

    // Guess handling via "!guess"
    if (message.content.startsWith('!')) {
      const channelId = message.channel.id;
      const session = gameSessions[channelId];
      if (!session?.active) return;

      const guess = message.content.slice(1).trim().toLowerCase();
      const userId = message.author.id;
      const username = message.author.toString();
      const guesses = session.players[userId] ?? 0;

      if (guesses >= session.limit) {
        await message.react('☠️');
        return;
      }

      if (guess === session.target) {
        session.active = false;
        await message.channel.send(`🎉 ${username} guessed right! It was **${session.target}**.`);
      } else {
        session.players[userId] = guesses + 1;
        const remaining = session.limit - session.players[userId];

        try {
          await message.react('❌');
          if (remaining >= 0 && remaining <= 10) {
            await message.react(numberEmoji[remaining]);
          }
          if (session.players[userId] >= session.limit) {
            await message.react('☠️');
          }
        } catch (err) {
          console.error('❌ Failed to react to guess message:', err);
        }
      }
    }
  });
}
