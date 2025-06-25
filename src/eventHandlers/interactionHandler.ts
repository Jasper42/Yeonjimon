import { Client, Events, TextChannel, EmbedBuilder, Interaction } from 'discord.js';
import { awardCurrency, subtractCurrency } from '../utils/unbelieva';
import { addPoints, subtractPoints, removePlayer, getLeaderboard, LeaderboardEntry } from '../utils/pointsManager';
import { getUserFromId } from '../utils/gameUtils';
import { queryAI } from '../utils/aiUtils';
import config from '../config';
import { gameSessions, adminUserIds } from '../utils/botConstants';

function extractUserId(input: string | null): string | null {
  if (!input) return null;
  const match = input.match(/^<@!?(\d+)>$/);
  return match ? match[1] : input.trim();
}

const activeRpsGames: Map<string, { collector?: any; playCollector?: any }> = new Map();

export function setupInteractionHandler(client: Client) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      const channelId: string | undefined = interaction.channel?.id;
      const session = channelId ? gameSessions[channelId] : undefined;
      const userId: string = interaction.user.id;
      const slotsCost: number = config.SlotsCost;

      switch (interaction.commandName) {
        case 'slots': {
          const slotEmojis: string[] = [':butterfly:', ':four_leaf_clover:', ':cherries:', ':lemon:', ':star:'];
          const reel1: string[] = [...slotEmojis];
          const reel2: string[] = [...slotEmojis].reverse();
          const reel3: string[] = [slotEmojis[1], slotEmojis[4], slotEmojis[0], slotEmojis[2], slotEmojis[3]];

          const index1: number = Math.floor(Math.random() * reel1.length);
          const index2: number = Math.floor(Math.random() * reel2.length);
          const index3: number = Math.floor(Math.random() * reel3.length);

          const result: string = `
${reel1[(index1 - 1 + reel1.length) % reel1.length]} | ${reel2[(index2 - 1 + reel2.length) % reel2.length]} | ${reel3[(index3 - 1 + reel3.length) % reel3.length]}
${reel1[index1]} | ${reel2[index2]} | ${reel3[index3]}
${reel1[(index1 + 1) % reel1.length]} | ${reel2[(index2 + 1) % reel2.length]} | ${reel3[(index3 + 1) % reel3.length]}
`;

          const slots: string[] = [reel1[index1], reel2[index2], reel3[index3]];
          let winnings: number = 0;

          const ThreeUniqueSlots: number = config.ThreeUnique;
          const threeMatchReward: number = config.ThreeMatchReward;
          const lemonMultiplier: number = config.LemonMultiplier;

          const isLemon = (slot: string): boolean => slot === ':lemon:';
          const hasThreeLemons: boolean = slots.every(isLemon);

          if (slots[0] === slots[1] && slots[0] === slots[2]) {
            winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
            const announcement: string = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
            await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
            await awardCurrency(userId, winnings);
          } else if (new Set(slots).size === 3) {
            winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
            const announcement: string = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
            await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
            await awardCurrency(userId, winnings);
          } else {
            await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**Better luck next time! -${slotsCost} coins.**` });
            await subtractCurrency(userId, slotsCost);
          }
          break;
        }

        case 'start': {
          const name: string = interaction.options.getString('name')!.toLowerCase();
          const limit: number = interaction.options.getInteger('limit') ?? 0;
          const groupName: string | undefined = interaction.options.getString('group')?.toLowerCase();
          const imageUrl: string | undefined = interaction.options.getString('image') ?? undefined;

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
            starterId: userId,
            starterName: interaction.user.username,
            imageUrl // set from slash command option
          };

          await interaction.reply({ content: `✅ Game started with ${limit} tries.`, ephemeral: true });

          // Announce game in channel after replying to interaction
          (async () => {
            const gamePingRoleId: string = config.GamePingRoleId;
            const textChannel = interaction.channel as TextChannel;
            if (textChannel?.send) {
              let gameAnnouncement: string = `<@${userId}> started a 🎮 Guess-the-Idol 🎮 game! \nType \`!idolname\` to guess. You have **${limit}** tries.`;
              if (groupName) {
                gameAnnouncement += `\nA group name has been provided!`;
              }
              if (gamePingRoleId == '0') {
                await textChannel.send(gameAnnouncement);
              } else {
                await textChannel.send(`${gameAnnouncement} <@&${gamePingRoleId}>`);
              }
            }
          })();
          break;
        }

        case 'end': 
          if (!session?.active) {
            await interaction.reply({ content: 'No game to end.', ephemeral: true });
            return;
          }
          session.active = false;
          await interaction.reply('🛑 Game ended.');
          if (session.imageUrl) {
            await (interaction.channel as TextChannel).send({ content: 'Here is the idol image!', files: [session.imageUrl] });
          } else {
            await (interaction.channel as TextChannel).send('No image was provided for this round.');
          }
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

            const aiReply = await queryAI(`${persona}\nUser: "${prompt}"\nYeonji:`);
            await interaction.reply(aiReply);
          } catch (err) {
            console.error('❌ Failed to get Groq response:', err);
            await interaction.reply({ content: '❌ Failed to get a response from Groq.', ephemeral: true });
          }
          break;
        }

        case 'leaderboard': {
          const showIds = interaction.options.getBoolean('showids');
          const leaderboard: LeaderboardEntry[] = await getLeaderboard();

          const topPerformers = leaderboard.slice(0, 10);

          let leaderboardContent = '```\n';
          leaderboardContent += 'Rank   | Username          | Points';
          if (showIds) {
              leaderboardContent += ' | User ID';
          }
          leaderboardContent += '\n---------------------------------------\n';

          if (topPerformers.length === 0) {
              leaderboardContent += 'No one has played yet!\n```';
          } else {
              topPerformers.forEach((entry, i) => {
                  let rankDisplay;
                  if (i === 0) {
                      rankDisplay = '1st 🥇';
                  } else if (i === 1) {
                      rankDisplay = '2nd 🥈';
                  } else if (i === 2) {
                      rankDisplay = '3rd 🥉';
                  } else {
                      rankDisplay = `#${i + 1}`;
                  }
                  const rank = rankDisplay.padEnd(6);
                  const username = entry.username.padEnd(17).substring(0, 17);
                  const points = entry.points.toString().padEnd(6);
                  let line = `${rank} | ${username} | ${points}`;
                  if (showIds) {
                      line += ` | ${entry.userId}`;
                  }
                  leaderboardContent += `${line}\n`;
              });
              leaderboardContent += '```';
          }

          const leaderboardEmbed = new EmbedBuilder()
              .setTitle('📊 Guess-the-Idol Leaderboard')
              .setDescription('Current standings for Guess-the-Idol.')
              .setColor('#5865F2')
              .setTimestamp();

          leaderboardEmbed.addFields({ name: 'Top Players', value: leaderboardContent });

          await interaction.reply({ embeds: [leaderboardEmbed] });
          break;
        }

        case 'x_admin_addpoints': {
          if (!adminUserIds.includes(userId)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
          const targetUserId = interaction.options.getString('player');
          const targetUserIdtrimmed = extractUserId(targetUserId);
          const pointsToAdd = interaction.options.getInteger('points');
          if (!targetUserIdtrimmed || !pointsToAdd) {
            await interaction.reply({ content: 'Please provide a user ID and points to add.', ephemeral: true });
            return;
          }
          const user = await getUserFromId(client, targetUserIdtrimmed);
          if (!user) {
            await interaction.reply({ content: `User not found: ${targetUserIdtrimmed}`, ephemeral: true });
            return;
          }
          await addPoints(targetUserIdtrimmed, user.username, pointsToAdd);
          await interaction.reply({ content: `Added ${pointsToAdd} points to ${user.username} (${targetUserIdtrimmed}).` });
          break;
        }

        case 'x_admin_subtractpoints': {
          if (!adminUserIds.includes(userId)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
          const targetUserId = interaction.options.getString('player');
          const targetUserIdtrimmed = extractUserId(targetUserId);
          const pointsToSubtract = interaction.options.getInteger('points');
          if (!targetUserIdtrimmed || !pointsToSubtract) {
            await interaction.reply({ content: 'Please provide a user ID and points to subtract.', ephemeral: true });
            return;
          }
          await subtractPoints(targetUserIdtrimmed, pointsToSubtract);
          await interaction.reply({ content: `Subtracted ${pointsToSubtract} points from ${targetUserIdtrimmed}.` });
          break;
        }

        case 'x_admin_removeplayer': {
          if (!adminUserIds.includes(userId)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
          const targetUserId = interaction.options.getString('user');
          const targetUserIdtrimmed = extractUserId(targetUserId);
          if (!targetUserIdtrimmed) {
            await interaction.reply({ content: 'Please provide a user ID to remove.', ephemeral: true });
            return;
          }
          await removePlayer(targetUserIdtrimmed);
          await interaction.reply({ content: `Removed ${targetUserIdtrimmed}.` });
          break;
        }

        case 'rps': {
          const userChoice = interaction.options.getString('choice');
          if (!userChoice) {
            await interaction.reply({ content: 'Please choose rock, paper, or scissors.', ephemeral: true });
            return;
          }
          const choices = ['rock', 'paper', 'scissors'];
          const botChoice = choices[Math.floor(Math.random() * choices.length)];
          let result: string;
          if (userChoice === botChoice) {
            result = "It's a tie!";
          } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
          ) {
            result = 'You win!';
          } else {
            result = 'You lose!';
          }
          await interaction.reply({ content: `You chose **${userChoice}**.\nI chose **${botChoice}**.\n${result}` });
          break;
        }

        case 'rps_game': {
          const opponent = interaction.options.getUser('opponent') || client.user;
          const betAmount = interaction.options.getInteger('bet_amount') ?? 0;
          // Now support rounds from options, default to 1
          const rounds = interaction.options.getInteger('rounds') ?? 1;
          const validRounds = [1, 3, 5];
          const totalRounds = validRounds.includes(rounds) ? rounds : 1;
          const winTarget = Math.ceil(totalRounds / 2);

          // Forbid betting against the bot itself
          if (opponent && opponent.id === client.user?.id && betAmount > 0) {
            await interaction.reply({ content: 'You cannot place a bet when playing against the bot.', ephemeral: true });
            return;
          }

          // Check for active game
          if (!opponent) {
            await interaction.reply({ content: 'Opponent not found.', ephemeral: true });
            return;
          }
          const gameKey = `rps:${interaction.channelId}:${interaction.user.id}:${opponent.id}`;
          if (activeRpsGames.has(gameKey)) {
            await interaction.reply({ content: 'You already have an active RPS game in this channel!', ephemeral: true });
            return;
          }

          async function handleBetDeduction(userA: string, userB: string, amount: number): Promise<boolean> {
            try {
              await subtractCurrency(userA, amount);
              if (userB !== client.user?.id) {
                await subtractCurrency(userB, amount);
              }
              return true;
            } catch {
              return false;
            }
          }

          async function refundBet(userA: string, userB: string, amount: number) {
            try {
              await awardCurrency(userA, amount);
              if (userB !== client.user?.id) {
                await awardCurrency(userB, amount);
              }
            } catch {}
          }

          // PvP
          if (opponent && opponent.id !== client.user?.id) {
            if (betAmount > 0) {
              const betSuccess = await handleBetDeduction(interaction.user.id, opponent.id, betAmount);
              if (!betSuccess) {
                await interaction.reply({ content: 'Failed to deduct bet from one or both players. Make sure both have enough coins.', ephemeral: true });
                return;
              }
            }

            let scores: Record<string, number> = { [interaction.user.id]: 0, [opponent.id]: 0 };
            let round = 1;
            let moves: Record<string, string> = {};
            let finished = false;

            const components: any[] = [
              {
                type: 1,
                components: [
                  { type: 2, label: 'Rock', style: 1, customId: 'rps_rock' },
                  { type: 2, label: 'Paper', style: 1, customId: 'rps_paper' },
                  { type: 2, label: 'Scissors', style: 1, customId: 'rps_scissors' }
                ]
              }
            ];

            await interaction.reply({
              content: `Rock-Paper-Scissors! ${interaction.user} vs ${opponent}\nFirst to ${winTarget} wins! Both players, choose your move below:\n${betAmount > 0 ? `💸 Bet: ${betAmount} coins each! Winner takes all. 💸` : ''}`,
              components
            });

            const playFilter = (btn: any) => btn.user.id === opponent.id || btn.user.id === interaction.user.id;
            const playCollector = interaction.channel?.createMessageComponentCollector({ filter: playFilter, time: 60000 });

            // Register the game as active
            activeRpsGames.set(gameKey, { playCollector });

            playCollector?.on('collect', async btn => {
              if (finished) return;
              const userChoice = btn.customId.split('_')[1];
              moves[btn.user.id] = userChoice;
              await btn.deferUpdate();

              // If both played, resolve round
              if (moves[interaction.user.id] && moves[opponent.id]) {
                const user1 = interaction.user;
                const user2 = opponent;
                const choice1 = moves[user1.id];
                const choice2 = moves[user2.id];

                let result = '';
                let actionMsg = '';

                function capitalize(str: string) {
                  return str.charAt(0).toUpperCase() + str.slice(1);
                }

                if (choice1 === choice2) {
                  result = `Round ${round}: It's a tie!`;
                } else if (
                  (choice1 === 'rock' && choice2 === 'scissors') ||
                  (choice1 === 'paper' && choice2 === 'rock') ||
                  (choice1 === 'scissors' && choice2 === 'paper')
                ) {
                  actionMsg = `${capitalize(choice1)} beats ${choice2}`;
                  scores[user1.id]++;
                  result = `Round ${round}: ${actionMsg}. ${user1} wins!`;
                } else {
                  actionMsg = `${capitalize(choice2)} beats ${choice1}`;
                  scores[user2.id]++;
                  result = `Round ${round}: ${actionMsg}. ${user2} wins!`;
                }

                let scoreMsg = `Score: ${user1} ${scores[user1.id]} - ${scores[user2.id]} ${user2}`;
                let nextMsg = '';
                round++;
                moves = {};

                // Check for match winner
                if (scores[user1.id] === winTarget || scores[user2.id] === winTarget) {
                  finished = true;
                  let winner = scores[user1.id] === winTarget ? user1 : user2;
                  let winId = scores[user1.id] === winTarget ? user1.id : user2.id;
                  let pool = betAmount > 0 ? betAmount * 2 : 0;
                  if (pool > 0) {
                    await awardCurrency(winId, pool);
                  }
                  await interaction.editReply({
                    content: `${result}\n${scoreMsg}\n${winner} wins the match!${pool > 0 ? `\n🏆 ${winner} wins ${pool} coins!` : ''}`,
                    components: []
                  });
                  playCollector.stop();
                } else {
                  nextMsg = `\nNext round: Both players, choose your move below.`;
                  await interaction.editReply({
                    content: `${result}\n${scoreMsg}${nextMsg}`,
                    components
                  });
                }
              }
            });

            playCollector?.on('end', async _collected => {
              activeRpsGames.delete(gameKey);
              if (!finished) {
                await interaction.editReply({ content: 'Game timed out! Not all players made a move.', components: [] });
                if (betAmount > 0) {
                  await refundBet(interaction.user.id, opponent.id, betAmount);
                  await interaction.followUp({ content: 'Bet refunded to both players due to no response.', ephemeral: false });
                }
              }
            });
          } else {
            // PvE vs bot
            if (betAmount > 0) {
              const betSuccess = await handleBetDeduction(interaction.user.id, client.user?.id || '', betAmount);
              if (!betSuccess) {
                await interaction.reply({ content: 'Failed to deduct bet. Make sure you have enough coins.', ephemeral: false });
                return;
              }
            }

            let userScore = 0;
            let botScore = 0;
            let round = 1;
            let finished = false;

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

            await interaction.reply({
              content: `🎮 **Rock-Paper-Scissors vs Yeonji!** 🎮\nFirst to ${winTarget} wins!\n**Round 1:**\nMake your move!${betAmount > 0 ? `\n💰 **Bet:** ${betAmount} coins! Winner takes all.` : ''}`,
              components
            });

            const filter = (i: any) => i.user.id === interaction.user.id;
            const collector = interaction.channel?.createMessageComponentCollector({ filter, time: 20000 });

            // Register the game as active
            const gameKeyBot = `rps:${interaction.channelId}:${interaction.user.id}:${client.user?.id}`;
            activeRpsGames.set(gameKeyBot, { collector });

            collector?.on('collect', async i => {
              if (finished) return;
              const choices = ['rock', 'paper', 'scissors'];
              const botChoice = choices[Math.floor(Math.random() * choices.length)];
              const userChoice = i.customId.split('_')[1];

              let rpsResult = '';
              let aiReply = '';
              if (userChoice === botChoice) {
                rpsResult = `[Draw]`;
                try {
                  aiReply = await queryAI(
                    `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just tied round ${round} of rock-paper-scissors with ${interaction.user.username}. Respond with a playful, witty, and slightly competitive remark in 1 sentence. Mention the user's choice: "${userChoice}".`
                  );
                } catch { aiReply = ''; }
              } else if (
                (userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')
              ) {
                userScore++;
                rpsResult = `[Win]`;
                try {
                  aiReply = await queryAI(
                    `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just lost round ${round} of rock-paper-scissors to ${interaction.user.username}. Respond with a playful, witty, and slightly dramatic comeback in 1 sentence. Mention the user's choice: "${userChoice}".`
                  );
                } catch { aiReply = ''; }
              } else {
                botScore++;
                rpsResult = `[Loss]`;
                try {
                  aiReply = await queryAI(
                    `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. You just won round ${round} of rock-paper-scissors against ${interaction.user.username}. Respond with a playful, teasing, and confident remark in 1 sentence. Mention the user's choice: "${userChoice}".`
                  );
                } catch { aiReply = ''; }
              }

              let scoreMsg = `Score: You ${userScore} - ${botScore} Yeonji`;
              let nextMsg = '';
              round++;

              // Check for match winner
              if (userScore === winTarget || botScore === winTarget) {
                finished = true;
                let winner = userScore === winTarget ? interaction.user : client.user;
                let pool = betAmount > 0 ? betAmount * 2 : 0;
                if (userScore === winTarget && pool > 0) {
                  await awardCurrency(interaction.user.id, pool);
                } else if (botScore === winTarget && pool > 0 && client.user) {
                  await awardCurrency(client.user.id, pool);
                }
                await i.update({
                  content: `I choose... **${botChoice}!** ${rpsResult} ${aiReply ? `\n${aiReply}` : ''}\n${scoreMsg}\n${winner} wins the match!${pool > 0 ? `\n🏆 ${winner} wins ${pool} coins!` : ''}`,
                  components: []
                });
                collector.stop();
              } else {
                nextMsg = `\nNext round: Choose your move!`;
                await i.update({
                  content: `I choose... **${botChoice}!** ${rpsResult} ${aiReply ? `\n${aiReply}` : ''}\n${scoreMsg}${nextMsg}`,
                  components
                });
              }
            });

            collector?.on('end', async () => {
              activeRpsGames.delete(gameKeyBot);
              if (!finished && collector.collected.size === 0) {
                await interaction.editReply({ content: 'No move was made in time!', components: [] });
                if (betAmount > 0) {
                  await refundBet(interaction.user.id, client.user?.id || '', betAmount);
                  await interaction.followUp({ content: 'Bet refunded due to no response.', ephemeral: true });
                }
              }
            });
          }
          break;
        }

        // Add more commands here as needed
      }
    } catch (err) {
      console.error('❌ Unhandled error in interaction handler:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ content: '❌ An error occurred while processing your command.', ephemeral: true });
        } catch {}
      }
    }
  });
}