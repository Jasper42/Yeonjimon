import { Client, Events, TextChannel } from 'discord.js';
import { registerCommands } from './registerCommands';
import config from './config';
import { awardCurrency } from './utils/unbelieva';
import { subtractCurrency } from './utils/unbelieva';

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
    const slotsCost = config.SlotsCost;
    const userId = interaction.user.id;

    if (interaction.commandName === 'slots') {
      const reel1 = [
        ':butterfly:',
        ':four_leaf_clover:',
        ':cherries:',
        ':lemon:',
        ':star:',
      ];

      const reel2 = [
        ':star:',
        ':lemon:',
        ':cherries:',
        ':four_leaf_clover:',
        ':butterfly:',
      ];

      const reel3 = [
        ':four_leaf_clover:',
        ':star:',
        ':butterfly:',
        ':cherries:',
        ':lemon:',
      ];

      // Select a random index for each reel
      const index1 = Math.floor(Math.random() * reel1.length);
      const index2 = Math.floor(Math.random() * reel2.length);
      const index3 = Math.floor(Math.random() * reel3.length);

      // Create the final reels string
      const result = `
  ${reel1[(index1 - 1 + reel1.length) % reel1.length]} | ${reel2[(index2 - 1 + reel2.length) % reel2.length]} | ${reel3[(index3 - 1 + reel3.length) % reel3.length]}
  ${reel1[index1]} | ${reel2[index2]} | ${reel3[index3]}
  ${reel1[(index1 + 1) % reel1.length]} | ${reel2[(index2 + 1) % reel2.length]} | ${reel3[(index3 + 1) % reel3.length]}
  `;

      const slots = [reel1[index1], reel2[index2], reel3[index3]];
      let winnings = 0;

      const twoMatchReward = config.TwoMatchReward;
      const threeMatchReward = config.ThreeMatchReward;
      const lemonMultiplier = config.LemonMultiplier;

      const isLemon = (slot: string) => slot === ':lemon:';
      const hasTwoLemons = slots.filter(isLemon).length === 2;
      const hasThreeLemons = slots.filter(isLemon).length === 3;

      if (slots[0] === slots[1] && slots[0] === slots[2]) {
        winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
        const announcement = hasThreeLemons ? 'Jackpot!' : 'Congratulations!';
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
        
        // Add the winnings to the user's bank
        await awardCurrency(userId, winnings);

      } else if (slots[0] === slots[1] || slots[0] === slots[2] || slots[1] === slots[2]) {
        winnings = hasTwoLemons ? twoMatchReward * lemonMultiplier : twoMatchReward;
        const announcement = hasTwoLemons ? 'mini jackpot!' : 'Good job!';
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
        
        // Add the winnings to the user's bank
        await awardCurrency(userId, winnings);

      } else {
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**Better luck next time!**` });
        
        // Subtract the slots cost from the user's bank
        await subtractCurrency(userId, slotsCost);
      }
  }

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

      const gamePingRoleId = config.GamePingRoleId;
      const textChannel = interaction.channel as TextChannel;
      if (textChannel?.send) {
        if (gamePingRoleId == '0') {
          await textChannel.send(`🎮 Guess-the-Idol game started! Type \`!idolname\` to guess. You have ${limit} tries.`);
        } else {
          await textChannel.send(`🎮 Guess-the-Idol game started! Type \`!idolname\` to guess. You have ${limit} tries. <@&${gamePingRoleId}>`);
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
        const guess_reward = config.Guess_reward;
        await awardCurrency(userId, guess_reward);
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
