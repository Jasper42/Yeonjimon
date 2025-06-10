import { Client, Events, TextChannel, EmbedBuilder } from 'discord.js';
import { registerCommands } from './registerCommands';
import config from './config';
import { awardCurrency, subtractCurrency } from './utils/unbelieva';
import { initDatabase, addPoints, subtractPoints, removePlayer, getLeaderboard } from './utils/pointsManager';
import { getUserFromId } from './utils/gameUtils';
import { queryGroq } from './utils/aiUtils';
import { isDev, gameSessions, groqCooldowns, groqQueue, adminUserIds, numberEmoji } from './utils/botConstants';

initDatabase();

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

      case 'rps_game': {
        const opponent = interaction.options.getUser('opponent') || client.user;
        const components = [
          {
        type: 1,
        components: [
          { type: 2, label: 'Rock', style: 1, customId: 'rps_rock' },
          { type: 2, label: 'Paper', style: 1, customId: 'rps_paper' },
          { type: 2, label: 'Scissors', style: 1, customId: 'rps_scissors' }
        ]
          }
        ];

        if (opponent && opponent.id !== client.user?.id) {
          // PvP: Both players get the play options immediately
          await interaction.reply({
        content: `Rock-Paper-Scissors! ${interaction.user} vs ${opponent}\nBoth players, choose your move below:`,
        components
          });

          const playFilter = (btn: any) => btn.user.id === opponent.id || btn.user.id === interaction.user.id;
          const playCollector = interaction.channel?.createMessageComponentCollector({ filter: playFilter, time: 22000 });
          let moves: { [userId: string]: string } = {};

          playCollector?.on('collect', async btn => {
        const userChoice = btn.customId.split('_')[1];
        moves[btn.user.id] = userChoice;
        await btn.deferUpdate();

        // If both players have played, determine result
        if (moves[interaction.user.id] && moves[opponent.id]) {
          const user1 = interaction.user;
          const user2 = opponent;
          const choice1 = moves[user1.id];
          const choice2 = moves[user2.id];

          let result = '';
          if (choice1 === choice2) {
            result = 'It\'s a tie!';
          } else if (
            (choice1 === 'rock' && choice2 === 'scissors') ||
            (choice1 === 'paper' && choice2 === 'rock') ||
            (choice1 === 'scissors' && choice2 === 'paper')
          ) {
            result = `${user1} wins!`;
          } else {
            result = `${user2} wins!`;
          }

          await interaction.editReply({
            content: `${user1} chose **${choice1}**. ${user2} chose **${choice2}**. ${result}`,
            components: []
          });
          playCollector.stop();
        }
          });

          playCollector?.on('end', async collected => {
        if (Object.keys(moves).length < 2) {
          await interaction.editReply({ content: 'Game timed out! Not all players made a move.', components: [] });
        }
          });
        } else {
          // PvE: Only reply once, then handle the rest with component interactions
          await interaction.reply({ content: `Choose your move!`, components });
          const filter = (i: any) => i.user.id === interaction.user.id;
          const collector = interaction.channel?.createMessageComponentCollector({ filter, time: 15000 });

          collector?.on('collect', async i => {
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const userChoice = i.customId.split('_')[1];

        let aiReply = '';
        let rpsResult = '';
        if (userChoice === botChoice) {
          rpsResult = '[Draw]';
          try {
            aiReply = await queryGroq(
              `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just tied a game of rock-paper-scissors with ${interaction.user.username}. Respond with a playful, witty, and slightly competitive remark in 1 sentence. Mention the user's choice: "${userChoice}".`
            );
          } catch (err) {
            console.error('❌ Failed to get Groq response:', err);
            aiReply = '';
          }
        } else if (
          (userChoice === 'rock' && botChoice === 'scissors') ||
          (userChoice === 'paper' && botChoice === 'rock') ||
          (userChoice === 'scissors' && botChoice === 'paper')
        ) {
          rpsResult = '[Win]';
          try {
            aiReply = await queryGroq(
              `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just lost a game of rock-paper-scissors to ${interaction.user.username}. Respond with a playful, witty, and slightly dramatic comeback in 1 sentence. And make sure to mention the user's choice: "${userChoice}".`
            );
          } catch (err) {
            console.error('❌ Failed to get Groq response:', err);
            aiReply = '';
          }
        } else {
          rpsResult = '[Loss]';
          try {
            aiReply = await queryGroq(
              `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just won a game of rock-paper-scissors against ${interaction.user.username}. Respond with a playful, teasing, and confident remark in 1 sentence. And make sure to mention the user's choice: "${userChoice}".`
            );
          } catch (err) {
            console.error('❌ Failed to get Groq response:', err);
            aiReply = '';
          }
        }

        await i.update({
          content: `I choose... **${botChoice}!** ${rpsResult} ${aiReply ? `\n${aiReply}` : ''}`,
          components: []
        });
        collector.stop();
          });

          collector?.on('end', async () => {
        if (collector.collected.size === 0) {
          await interaction.editReply({ content: 'No move was made in time!', components: [] });
        }
          });
        }
        break;
      }
      
      case 'leaderboard':
        const showIds = interaction.options.getBoolean('showids');
        const leaderboard = await getLeaderboard();

        const topPerformers = leaderboard.slice(0, 10); // Limiting to top 10 for this style

        let leaderboardContent = '```\n'; // Start a code block
        leaderboardContent += 'Rank   | Username          | Points'; // Increased "Rank" column width
        if (showIds) {
            leaderboardContent += ' | User ID';
        }
        leaderboardContent += '\n---------------------------------------\n'; // Separator - adjust if needed for User ID column

        if (topPerformers.length === 0) {
            leaderboardContent += 'No one has played yet!\n```';
        } else {
            topPerformers.forEach((entry, i) => {
                let rankDisplay;
                // Add emojis for top 3, ensuring padding still works
                if (i === 0) {
                    rankDisplay = '1st 🥇';
                } else if (i === 1) {
                    rankDisplay = '2nd 🥈';
                } else if (i === 2) {
                    rankDisplay = '3rd 🥉';
                } else {
                    rankDisplay = `#${i + 1}`;
                }

                // Adjust padEnd length for rank to account for emojis
                const rank = rankDisplay.padEnd(6); // Increased padding to accommodate emojis

                const username = entry.username.padEnd(17).substring(0, 17); // Pad and truncate username
                const points = entry.points.toString().padEnd(6); // Pad points

                let line = `${rank} | ${username} | ${points}`;
                if (showIds) {
                    line += ` | ${entry.userId}`;
                }
                leaderboardContent += `${line}\n`;
            });
            leaderboardContent += '```'; // End the code block
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setTitle('📊 Guess-the-Idol Leaderboard')
            .setDescription('Current standings for Guess-the-Idol.')
            .setColor('#5865F2') // Discord's blurple
            .setTimestamp();

        leaderboardEmbed.addFields({ name: 'Top Players', value: leaderboardContent });

        await interaction.reply({ embeds: [leaderboardEmbed] });
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
        
        const user = await getUserFromId(client, userId);
        if (user) addPoints(userId, user.username, 3);
        const starterUser = await getUserFromId(client, session.starterId);
        if (starterUser) addPoints(session.starterId, starterUser.username, 1);

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
