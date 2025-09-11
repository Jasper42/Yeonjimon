import { Client, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

    // Auto Twitter/Instagram embed fixer - detect social media links in any message
    if (!config.EMBED_FIXER_ENABLED) return;
    
    const twitterRegex = /https?:\/\/(twitter\.com|x\.com)/i;
    const instagramRegex = /https?:\/\/(www\.)?instagram\.com/i;
    
    const twitterMatch = message.content.match(twitterRegex);
    const instagramMatch = message.content.match(instagramRegex);
    
    if (twitterMatch || instagramMatch) {
      try {
        let fixedMessage = message.content;
        
        // Count total social media links in the message
        const twitterLinks = (message.content.match(/https?:\/\/(twitter\.com|x\.com)\/\S+/gi) || []).length;
        const instagramLinks = (message.content.match(/https?:\/\/(www\.)?instagram\.com\/\S+/gi) || []).length;
        const totalLinks = twitterLinks + instagramLinks;
        
        // Determine link text based on count
        const linkText = totalLinks === 1 ? "Fixed the embed for you" : 
                        twitterLinks > 0 && instagramLinks > 0 ? 
                          (twitterLinks === 1 ? "Twitter link" : "Twitter link") + " / " + (instagramLinks === 1 ? "Instagram link" : "Instagram link") :
                        twitterLinks > 0 ? "Twitter link" : "Instagram link";
        
        // Find and replace Twitter/X URLs with hyperlinks
        fixedMessage = fixedMessage
          .replace(/https?:\/\/twitter\.com\/\S+/gi, (url) => {
            const fixedUrl = url.replace('twitter.com', 'fxtwitter.com');
            return totalLinks === 1 ? `[${linkText}](${fixedUrl})` : `[Twitter link](${fixedUrl})`;
          })
          .replace(/https?:\/\/x\.com\/\S+/gi, (url) => {
            const fixedUrl = url.replace('x.com', 'fxtwitter.com');
            return totalLinks === 1 ? `[${linkText}](${fixedUrl})` : `[Twitter link](${fixedUrl})`;
          });
        
        // Find and replace Instagram URLs with hyperlinks
        fixedMessage = fixedMessage
          .replace(/https?:\/\/(www\.)?instagram\.com\/\S+/gi, (url) => {
            const fixedUrl = url.replace(/https?:\/\/(www\.)?instagram\.com/i, 'https://kkinstagram.com');
            return totalLinks === 1 ? `[${linkText}](${fixedUrl})` : `[Instagram link](${fixedUrl})`;
          });
        
        // Send the fixed message with better embeds
        const revertButton = new ButtonBuilder()
          .setCustomId(`revert_embed_${message.author.id}`)
          .setLabel('⤴️')
          .setStyle(ButtonStyle.Secondary);
        
        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_embed_${message.author.id}`)
          .setLabel('🗑️')
          .setStyle(ButtonStyle.Danger);
        
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(revertButton, deleteButton);
        
        await message.channel.send({
          content: fixedMessage,
          components: [row]
        });
        
        // Wait a moment then suppress the original embed to prevent double embeds
        setTimeout(async () => {
          try {
            await message.suppressEmbeds(true);
          } catch (suppressError) {
            // If suppression fails, it's usually a permissions issue
            console.log('Could not suppress embed (may lack permissions)');
          }
        }, 2000); // Wait 2 seconds for Discord to generate the embed
        
      } catch (error) {
        console.error('❌ Error fixing social media embed:', error);
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

  // Handle embed deletion button interactions
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    
    // Check if it's a revert embed button
    if (interaction.customId.startsWith('revert_embed_')) {
      const originalPosterId = interaction.customId.split('_')[2];
      
      // Only allow the original poster to revert
      if (interaction.user.id !== originalPosterId) {
        await interaction.reply({
          content: 'Only the original poster can revert this embed.',
          flags: 64 // Ephemeral flag
        });
        return;
      }
      
      // Get the original message to restore the content
      try {
        // Get the fixed message content and revert it back to original links
        const fixedContent = interaction.message.content;
        
        // Revert the fixed links back to original format
        const originalContent = fixedContent
          .replace(/\[Fixed the embed for you\]\((https?:\/\/fxtwitter\.com\/[^)]+)\)/gi, (match, url) => {
            return url.replace('fxtwitter.com', 'twitter.com');
          })
          .replace(/\[Fixed the embed for you\]\((https?:\/\/kkinstagram\.com\/[^)]+)\)/gi, (match, url) => {
            return url.replace('kkinstagram.com', 'instagram.com');
          })
          .replace(/\[Twitter link\]\((https?:\/\/fxtwitter\.com\/[^)]+)\)/gi, (match, url) => {
            return url.replace('fxtwitter.com', 'twitter.com');
          })
          .replace(/\[Instagram link\]\((https?:\/\/kkinstagram\.com\/[^)]+)\)/gi, (match, url) => {
            return url.replace('kkinstagram.com', 'instagram.com');
          });
        
        // Delete the original fixed message
        await interaction.message.delete();
        
        // Send a new message with the sassy response and original links
        if (interaction.channel && 'send' in interaction.channel) {
          // Create a delete button for the reverted message
          const deleteRevertedButton = new ButtonBuilder()
            .setCustomId(`delete_reverted_${originalPosterId}`)
            .setLabel('🗑️')
            .setStyle(ButtonStyle.Danger);
          
          const revertedRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(deleteRevertedButton);
          
          await interaction.channel.send({
            content: `Oh, you don't want me to fix the link embed huh\n${originalContent}`,
            components: [revertedRow]
          });
        }
        
      } catch (error) {
        console.error('Failed to revert embed message:', error);
        await interaction.reply({
          content: 'Failed to revert the message.',
          flags: 64 // Ephemeral flag
        });
      }
    }
    
    // Check if it's a delete embed button
    else if (interaction.customId.startsWith('delete_embed_')) {
      const originalPosterId = interaction.customId.split('_')[2];
      
      // Only allow the original poster to delete
      if (interaction.user.id !== originalPosterId) {
        await interaction.reply({
          content: 'Only the original poster can delete this embed.',
          flags: 64 // Ephemeral flag
        });
        return;
      }
      
      // Simply delete the message
      try {
        await interaction.message.delete();
      } catch (error) {
        console.error('Failed to delete embed message:', error);
        await interaction.reply({
          content: 'Failed to delete the message.',
          flags: 64 // Ephemeral flag
        });
      }
    }
    
    // Check if it's a delete reverted message button
    else if (interaction.customId.startsWith('delete_reverted_')) {
      const originalPosterId = interaction.customId.split('_')[2];
      
      // Only allow the original poster to delete
      if (interaction.user.id !== originalPosterId) {
        await interaction.reply({
          content: 'Only the original poster can delete this message.',
          flags: 64 // Ephemeral flag
        });
        return;
      }
      
      // Simply delete the reverted message
      try {
        await interaction.message.delete();
      } catch (error) {
        console.error('Failed to delete reverted message:', error);
        await interaction.reply({
          content: 'Failed to delete the message.',
          flags: 64 // Ephemeral flag
        });
      }
    }
  });
}