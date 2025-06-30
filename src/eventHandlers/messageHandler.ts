import { Client, Events } from 'discord.js';
import config from '../config';
import { awardCurrency } from '../utils/unbelieva';
import { gameSessions, numberEmoji } from '../utils/botConstants';
import { handleGuessCooldown } from '../utils/aiHintUtils';
import { addPoints, recordGameWin, recordStarterReward, recordAssistReward } from '../utils/pointsManager';

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

        // Check if this is the first correct guess (winner)
        if (session.correctGuessers.size === 1) {
          // This is the main winner
          session.active = false;

          const guess_reward = config.Guess_reward;
          const starterReward = Math.ceil(guess_reward * 0.60);

          let revealMsg = `🎉 ${userNamePing} guessed right! It was **${session.target}**. +${guess_reward} coins awarded! \nA percentage of the prize was also given to the coordinator. +${starterReward} `;
          if (session.imageUrl) {
            revealMsg += `\n**Image Reveal:**\n${session.imageUrl}`;
          }

          await message.channel.send(revealMsg);
          
          // Award main winner
          await addPoints(userId, userName, 3);
          await recordGameWin(userId, userName, 3, guess_reward);
          await awardCurrency(userId, guess_reward);
          
          // Award game starter
          await addPoints(session.starterId, session.starterName, 1);
          await recordStarterReward(session.starterId, session.starterName, 1, starterReward);
          await awardCurrency(session.starterId, starterReward);
          
          // Clean up game session to prevent memory leak
          delete gameSessions[channelId];
        } else {
          // Additional correct guesser (assist - not the main winner)
          await message.react('✅');
          await addPoints(userId, userName, 1);
          await recordAssistReward(userId, userName, 1);
          
          // Send a message about the assist
          await message.channel.send(`✅ ${userNamePing} also got it right! +1 assist point awarded!`);
        }
      } else if (session.groupname && guess === session.groupname) {
        await message.react('✅');
        // Award assist point for guessing the group correctly
        await addPoints(userId, userName, 1);
        await recordAssistReward(userId, userName, 1);
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