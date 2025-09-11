import { Client, Events } from 'discord.js';
import config from '../config';
import { awardCurrency } from '../utils/unbelieva';
import { gameSessions, numberEmoji } from '../utils/botConstants';
import { handleGuessCooldown } from '../utils/aiHintUtils';
import { addPoints, recordGameWin, recordStarterReward, recordAssistReward } from '../utils/pointsManager';
import { checkAndUnlockAchievements, sendAchievementAnnouncements } from '../utils/achievementUtils';

export function setupMessageHandler(client: Client) {
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

    // Auto Twitter embed fixer - detect Twitter links in any message
    const twitterRegex = /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+(\?.*)?/i;
    const twitterMatch = message.content.match(twitterRegex);
    
    if (twitterMatch) {
      try {
        const twitterUrl = twitterMatch[0];
        
        // Convert Twitter/X URL to fxtwitter for better embeds
        let fixedUrl = twitterUrl
          .replace(/https?:\/\/twitter\.com/i, 'https://fxtwitter.com')
          .replace(/https?:\/\/x\.com/i, 'https://fxtwitter.com');
        
        // Remove query parameters that might interfere with embeds
        fixedUrl = fixedUrl.split('?')[0];
        
        // Suppress the original embed to prevent double embeds
        await message.suppressEmbeds(true);
        
        // Send the fixed URL with better embed
        await message.channel.send(`🔗 **Fixed Twitter embed from ${message.author.username}:**\n${fixedUrl}`);
        
      } catch (error) {
        console.error('❌ Error fixing Twitter embed:', error);
      }
    }

    // Idol guessing logic "!"
    if (message.content.startsWith('!')) {
      const channelId = message.channel.id;
      const session = gameSessions[channelId];
      if (!session?.active) return;

      const guess = message.content.slice(1).trim().toLowerCase();
      const userId = message.author.id;
      const userNamePing = message.author.toString();
      const userName = message.author.username;
      const guesses = session.players[userId] ?? 0;

      if (guesses >= session.limit) {
        await message.react('☠️');
        return;
      }

      if (guess === session.target) {
        // Check if this user already guessed correctly
        if (session.correctGuessers.has(userId)) {
          await message.react('✅');
          return;
        }

        // Add user to correct guessers
        session.correctGuessers.add(userId);

        // Check if this is the first correct guess (winner - end the game)
        if (session.correctGuessers.size === 1) {
          // This is the main winner - END THE GAME
          session.active = false;
          await message.react('🎉');

          // Calculate rewards
          const guess_reward = config.Guess_reward;
          const starterReward = Math.ceil(guess_reward * 0.60);
          const assistReward = Math.ceil(guess_reward * 0.30);

          // Award main winner
          await addPoints(userId, userName, 3);
          await recordGameWin(userId, userName, 3, guess_reward);
          await awardCurrency(userId, guess_reward);

          // Award game starter
          await addPoints(session.starterId, session.starterName, 1);
          await recordStarterReward(session.starterId, session.starterName, 1, starterReward);
          await awardCurrency(session.starterId, starterReward);

          // Award group guesser (if any) - but only if they're not the winner
          let groupRewardMsg = '';
          if (session.groupGuesser && session.groupGuesser.userId !== userId) {
            await addPoints(session.groupGuesser.userId, session.groupGuesser.username, 1);
            await recordAssistReward(session.groupGuesser.userId, session.groupGuesser.username, 1, assistReward);
            await awardCurrency(session.groupGuesser.userId, assistReward);
            groupRewardMsg = `\n🤝 **Assist:** <@${session.groupGuesser.userId}> [+1 Point] and [+${assistReward} Coins]`;
          }

          // Create natural reward message
          let revealMsg = `🎉 ${userNamePing} guessed correctly! It's **${session.target}**!\n\n` +
                         `🏆 **Rewards:**\n` +
                         `🥇 **Winner:** ${userNamePing} [+3 Points] and [+${guess_reward} Coins]\n` +
                         `🎮 **Game Starter:** <@${session.starterId}> [+1 Point] and [+${starterReward} Coins]${groupRewardMsg}`;

          if (session.imageUrl) {
            revealMsg += `\n\n${session.imageUrl}`;
          }

          await message.channel.send(revealMsg);
          
          // Check for new achievements after all rewards are given
          (async () => {
            try {
              const newWinnerAchievements = await checkAndUnlockAchievements(userId, userName, client);
              const newStarterAchievements = await checkAndUnlockAchievements(session.starterId, session.starterName, client);
              
              // Send achievement announcements to level channel
              if (newWinnerAchievements.length > 0) {
                await sendAchievementAnnouncements(client, newWinnerAchievements, userId, userName);
              }
              
              if (newStarterAchievements.length > 0) {
                await sendAchievementAnnouncements(client, newStarterAchievements, session.starterId, session.starterName);
              }
              
              // Check achievements for group guesser if they exist and aren't the winner
              if (session.groupGuesser && session.groupGuesser.userId !== userId) {
                const newAssistAchievements = await checkAndUnlockAchievements(session.groupGuesser.userId, session.groupGuesser.username, client);
                if (newAssistAchievements.length > 0) {
                  await sendAchievementAnnouncements(client, newAssistAchievements, session.groupGuesser.userId, session.groupGuesser.username);
                }
              }
            } catch (error) {
              console.error('Error checking achievements:', error);
            }
          })();
          
          // Clean up game session to prevent memory leak
          delete gameSessions[channelId];
        } else {
          // Additional correct guesser - just acknowledge but don't end game yet
          await message.react('✅');
          await message.channel.send(`✅ ${userNamePing} also got it right! (Game continues)`);
        }
      } else if (session.groupname && guess === session.groupname) {
        // Handle group name guessing
        if (session.groupGuesser) {
          // Someone already guessed the group
          await message.react('✅');
          await message.channel.send(`✅ ${session.groupGuesser.username} has already guessed the group name! It's **${session.groupname}**`);
        } else {
          // First person to guess the group
          session.groupGuesser = { userId, username: userName };
          await message.react('✅');
          await message.channel.send(`✅ ${userNamePing} correctly guessed the group name! **${session.groupname}** (Assist points will be awarded when the game ends)`);
        }
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
          await handleGuessCooldown(
            channelId,
            guess,
            remaining,
            session,
            message.member?.displayName || message.author.username,
            async (msg) => { await message.channel.send(msg); }
          );
        } catch (err) {
          console.error('❌ Failed to react to guess message:', err);
        }
      }
    }
  });
}