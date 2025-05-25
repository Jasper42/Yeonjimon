import { Client, Events, TextChannel} from 'discord.js';
import { registerCommands } from './registerCommands';
import config from './config';
import { awardCurrency, subtractCurrency } from './utils/unbelieva';
import { initDatabase, addPoints, subtractPoints, removePlayer, getLeaderboard } from './utils/pointsManager';
import { getUserFromId } from './utils/getUserFromId';
import { queryGroq } from './utils/queryGroq';

initDatabase();

interface GameSession {
  target: string;
  limit: number;
  groupname?: string;
  active: boolean;
  players: Record<string, number>;
  starterId: string;
}

const isDev = config.isDev;
const gameSessions: Record<string, GameSession> = {};
const groqCooldowns: Record<string, boolean> = {};
const groqQueue: Record<string, string[]> = {};
const adminUserIds = ['1213277076472201256', '1261847335009517693', '1280582630513053810'];

const numberEmoji: Record<number, string> = {
  0: '0️⃣', 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣',
  5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
};



export function setupEventHandlers(client: Client) {
  client.once(Events.ClientReady, async () => {
    if (!client.user) {
      console.error('❌ client.user is undefined!');
      return;
    }

    console.log(`🤖 Logged in as ${client.user.tag}`);
    await registerCommands(client.user.id);

    if (isDev) { 
      const devChannel = client.channels.cache.get(config.LEFTRIGHT_ID ?? '0') as TextChannel;
      if (devChannel) await devChannel.send('Yeonjimon is online!');
    }
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const channelId = interaction.channel?.id;
    const session = channelId ? gameSessions[channelId] : undefined;
    const userId = interaction.user.id;
    const slotsCost = config.SlotsCost;


    switch (interaction.commandName) {
      case 'slots':
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

        const index1 = Math.floor(Math.random() * reel1.length);
        const index2 = Math.floor(Math.random() * reel2.length);
        const index3 = Math.floor(Math.random() * reel3.length);

        const result = `
    ${reel1[(index1 - 1 + reel1.length) % reel1.length]} | ${reel2[(index2 - 1 + reel2.length) % reel2.length]} | ${reel3[(index3 - 1 + reel3.length) % reel3.length]}
    ${reel1[index1]} | ${reel2[index2]} | ${reel3[index3]}
    ${reel1[(index1 + 1) % reel1.length]} | ${reel2[(index2 + 1) % reel2.length]} | ${reel3[(index3 + 1) % reel3.length]}
    `;

        const slots = [reel1[index1], reel2[index2], reel3[index3]];
        let winnings = 0;

        const ThreeUniqueSlots = config.ThreeUnique;
        const threeMatchReward = config.ThreeMatchReward;
        const lemonMultiplier = config.LemonMultiplier;

        const isLemon = (slot: string) => slot === ':lemon:';
        const hasThreeLemons = slots.filter(isLemon).length === 3;

        if (slots[0] === slots[1] && slots[0] === slots[2]) {
          winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
          const announcement = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
          await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
          
          await awardCurrency(userId, winnings);

        } else if (slots[0] !== slots[1] && slots[0] !== slots[2] && slots[1] !== slots[2]) {
          winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
          const announcement = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
          await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
          
          await awardCurrency(userId, winnings);

        } else {
          await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**Better luck next time! -${slotsCost} coins.**` });
          await subtractCurrency(userId, slotsCost);
        }
        break;

      case 'start':
        const name = interaction.options.getString('name')!.toLowerCase();
        const limit = interaction.options.getInteger('limit') ?? 0;
        const groupName = interaction.options.getString('group')?.toLowerCase();

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
          groupname: groupName,
          active: true,
          players: {},
          starterId: userId
        };

        await interaction.reply({ content: `✅ Game started with ${limit} tries.`, ephemeral: true });

        const gamePingRoleId = config.GamePingRoleId;
        const textChannel = interaction.channel as TextChannel;
        if (textChannel?.send) {
          let gameAnnouncement = `<@${userId}> started a 🎮 Guess-the-Idol 🎮 game! \nType \`!idolname\` to guess. You have **${limit}** tries.`;
          if (groupName) {
            gameAnnouncement += `\nA group name has been provided!`;
          }
          if (gamePingRoleId == '0') {
            await textChannel.send(gameAnnouncement);
          } else {
            await textChannel.send(`${gameAnnouncement} <@&${gamePingRoleId}>`);
          }
        }
        break;

      case 'end': 
        if (!session?.active) {
          await interaction.reply({ content: 'No game to end.', ephemeral: true });
          return;
        }
        session.active = false;
        await interaction.reply('🛑 Game ended.');
        break;
        
      case 'chat': {
        const prompt = interaction.options.getString('message');
        if (!prompt) {
          await interaction.reply({ content: 'You didn\'t say anything.'});
          return;
        }

        try {
          const persona = `
      You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. 
      You never miss a chance to throw a clever comeback and you're fun.
      You use casual-polite language and occasionally some slangs. However, keep it elegent.
      Respond to the following message like Kwak Yeonji would and keep it at 3 or less sentences.:
      `;

          const aiReply = await queryGroq(`${persona}\nUser: "${prompt}"\nYeonji:`);
          await interaction.reply(aiReply);
        } catch (err) {
          console.error('❌ Failed to get Groq response:', err);
          await interaction.reply({ content: '❌ Failed to get a response from Groq.', ephemeral: true });
        }
        break;
      }
      case 'leaderboard':
        const showIds = interaction.options.getBoolean('showids');
        const leaderboard = await getLeaderboard();
        const leaderboardText = Array.isArray(leaderboard)
          ? `🎮 Guess-the-Idol 🎮 Leaderboard:\n${leaderboard.map((entry, i) => `${i + 1}. ${showIds ? `${entry.userId} - ` : ''}${entry.username}: ${entry.points}`).join('\n')}`
          : String(leaderboard);
        await interaction.reply({ content: leaderboardText });
        break;

      case 'x_admin_addpoints': {
        if (!adminUserIds.includes(userId)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return; // Exit early if the user is not an admin
        }
        
        const targetUserId = interaction.options.getString('player');
        const targetUserIdtrimmed = targetUserId?.slice(2, -1).trim();
        const pointsToAdd = interaction.options.getInteger('points');
        if (!targetUserIdtrimmed || !pointsToAdd) {
          await interaction.reply({ content: 'Please provide a user ID and points to add.', ephemeral: true });
          return;
        }
        const user = await getUserFromId(client, targetUserIdtrimmed);
        await addPoints(targetUserIdtrimmed, user?.username || '', pointsToAdd);
        await interaction.reply({ content: `Added ${pointsToAdd} points to ${targetUserId}.` });
        break;
      }
      
      case 'x_admin_subtractpoints': {
        if (!adminUserIds.includes(userId)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return; // Exit early if the user is not an admin
        }
        
        const targetUserId = interaction.options.getString('player');
        const targetUserIdtrimmed = targetUserId?.slice(2, -1).trim();
        const pointsToSubtract = interaction.options.getInteger('points');
        if (!targetUserIdtrimmed || !pointsToSubtract) {
          await interaction.reply({ content: 'Please provide a user ID and points to subtract.', ephemeral: true });
          return;
        }
        await subtractPoints(targetUserIdtrimmed, pointsToSubtract);
        await interaction.reply({ content: `Subtracted ${pointsToSubtract} points from ${targetUserId}.` });
        break;
      }

      case 'x_admin_removeplayer': {
        if (!adminUserIds.includes(userId)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return; // Exit early if the user is not an admin
        }
        
        const targetUserId = interaction.options.getString('user');
        if (!targetUserId) {
          await interaction.reply({ content: 'Please provide a user ID to remove.', ephemeral: true });
          return;
        }
        await removePlayer(targetUserId);
        await interaction.reply({ content: `Removed ${targetUserId}.` });
        break;

      //more commands can be added here
    }
  }
});

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // Reactions for attachments
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
    
    // Idol guessing logic "!"
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
        
        const guess_reward = config.Guess_reward;
        const starterReward = Math.ceil(guess_reward * 0.60);
        await message.channel.send(`🎉 ${username} guessed right! It was **${session.target}**. +${guess_reward} coins awarded! \nA percentage of the prize was also given to the coordinator. +${starterReward} `);
        await awardCurrency(userId, guess_reward);
        await awardCurrency(session.starterId, starterReward);
        const trimmedUserId = userId?.slice(2, -1).trim();
        const trimmedStarterId = session.starterId?.slice(2, -1).trim();

        addPoints(trimmedUserId, username, 3);
        const starterUser = await getUserFromId(client, session.starterId);
        if (starterUser) addPoints(trimmedStarterId, starterUser.username, 1);

      } else if (session.groupname && guess === session.groupname) {
        await message.react('✅');
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

          
          // Cooldown logic
          if (!groqCooldowns[channelId]) {
            groqCooldowns[channelId] = true;

            const userName = message.member?.displayName || message.author.username;
            const hintPrompt = remaining <= 2
            ? `${userName} guessed "${guess}" but it's wrong. Respond with a slightly short, witty, and playful message, and give a gentle hint about the idol. Keep it 3 sentences or shorter. "${session.target}" is the answer and you're not supposed to reveal it.`
            : `${userName} guessed "${guess}" for a K-pop idol, but it's wrong. Respond with a slightly short, witty, and playful message. Keep it 3 sentences or shorter.`;


            const aiReply = await queryGroq(hintPrompt);
            await message.channel.send(aiReply); //use this to send a message in channel
            // await message.reply(aiReply); //use this to reply

            // Cooldown reset
            setTimeout(async () => {
              groqCooldowns[channelId] = false;

              if (groqQueue[channelId]?.length > 0) {
                const replies = groqQueue[channelId].join(', ');
                const generalPrompt = remaining <= 2
                  ? `Multiple people guessed (${replies}) but all were wrong. Respond with a slightly short, playful and teasing message. Give a light hint about the idol. Keep it 3 sentences or shorter. "${session.target}" is the answer and you're not supposed to reveal it.`
                  : `Multiple users guessed (${replies}) and were wrong. Respond with a slightly short and witty group comment, playful and fun. Keep it 3 sentences or shorter.`;
                
                const generalReply = await queryGroq(generalPrompt);
                await message.channel.send(generalReply);
                groqQueue[channelId] = [];
              }
            }, 10000);

          } else {
            // If on cooldown, queue the guess
            if (!groqQueue[channelId]) groqQueue[channelId] = [];
            groqQueue[channelId].push(guess);
          }

        } catch (err) {
          console.error('❌ Failed to react to guess message:', err);
        }
      }

    }
  });
}

// TODO: adding/removing roles based on leaderboard position