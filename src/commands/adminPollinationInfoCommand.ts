import { Command, CommandContext } from './types';
import { db } from '../utils/pointsManager';
import { TextChannel } from 'discord.js';

export const checkPollinationCommand: Command = {
  name: 'check_pollination',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    
    // Check if interaction is already handled
    if (interaction.replied || interaction.deferred) {
      console.log('Interaction already handled, skipping...');
      return;
    }
    
    try {
      // Immediately defer the reply to prevent timeout
      console.log('Deferring reply for check_pollination command...');
      await interaction.deferReply();
      console.log('Successfully deferred reply.');
      
      const pollinationNumberOption = interaction.options.get('number');
      const userOption = interaction.options.get('user');
      const channelId = '1306306027767205971';
      const guildId = interaction.guildId;

      // If user option is provided, list all pollinations by that user
      if (userOption && userOption.user && userOption.user.id) {
        const userId = userOption.user.id;
        
        await interaction.editReply({ content: '⏳ Searching for pollinations...' });
        
        // Wrap database query in Promise to properly handle async
        const pollinations = await new Promise<any[]>((resolve, reject) => {
          db.all(
            `SELECT * FROM pollinations WHERE userId = ? AND content_numbers IS NOT NULL AND TRIM(content_numbers) != '' ORDER BY pollination_number ASC`,
            [userId],
            (err, rows) => {
              if (err) {
                reject(err);
              } else {
                resolve(rows || []);
              }
            }
          );
        });
        
        if (pollinations.length === 0) {
          await interaction.editReply({ content: `No pollinations found for <@${userId}>.` });
          return;
        }
        
        // Build pollination list as lines (show only emoji number(s), not sequential number)
        const pollinationList = pollinations.map((row: any) => {
          const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
          const contentInfo = row.content_numbers ? ` (emoji: ${row.content_numbers})` : '';
          return `${contentInfo} [jump](${link})`;
        });

        let header = `<@${userId}> has ${pollinations.length} pollinations:`;
        let reply = header + '\n' + pollinationList.join('\n');
        
        if (reply.length <= 2000) {
          await interaction.editReply({ content: reply });
        } else {
          // If too long, send as a file
          const fileContent = header + '\n' + pollinationList.join('\n');
          await interaction.editReply({
            content: `<@${userId}> has too many pollinations to display in chat. See attached file.`,
            files: [{ attachment: Buffer.from(fileContent, 'utf-8'), name: `pollinations_${userId}.txt` }]
          });
        }
        return;
      }

      // Support single emoji number or range (e.g., 50 or 50-60) for content_numbers
      if (!pollinationNumberOption || !pollinationNumberOption.value) {
        await interaction.editReply({ content: 'Please provide a valid emoji number, range, or user.' });
        return;
      }

      let numberInput = pollinationNumberOption.value as string; // Always a string from StringOption
      let emojiNumbers: number[] = [];

      if (numberInput.includes('-')) {
        // Range input as string, e.g., '50-60'
        const parts = numberInput.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const from = Math.min(parts[0], parts[1]);
          const to = Math.max(parts[0], parts[1]);
          for (let n = from; n <= to; n++) {
            emojiNumbers.push(n);
          }
        }
      } else {
        // Single number as string
        const singleNumber = parseInt(numberInput.trim(), 10);
        if (!isNaN(singleNumber)) {
          emojiNumbers = [singleNumber];
        }
      }

      if (emojiNumbers.length === 0) {
        await interaction.editReply({ content: 'Please provide a valid emoji number or range (e.g., 50 or 50-60).' });
        return;
      }

      await interaction.editReply({ content: '⏳ Looking up pollination(s) by emoji number(s)...' });

      // Build SQL WHERE clause to match only whole numbers in the comma-separated content_numbers
      // For each emoji number, match: 'n', 'n,%', '%,n', '%,n,%'
      const whereClauses = emojiNumbers.map(() => 
        `(content_numbers = ? OR content_numbers LIKE ? OR content_numbers LIKE ? OR content_numbers LIKE ?)`
      ).join(' OR ');
      const params = emojiNumbers.flatMap(n => [
        `${n}`,
        `${n},%`,
        `%,${n}`,
        `%,${n},%`
      ]);

      // Wrap database query in Promise to properly handle async
      const pollinations = await new Promise<any[]>((resolve, reject) => {
        db.all(
          `SELECT * FROM pollinations WHERE ${whereClauses} ORDER BY pollination_number ASC`,
          params,
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows || []);
            }
          }
        );
      });

      if (pollinations.length === 0) {
        await interaction.editReply({ content: `No pollinations found for emoji number(s) ${emojiNumbers.length === 1 ? emojiNumbers[0] : emojiNumbers[0] + '-' + emojiNumbers[emojiNumbers.length-1]}.` });
        return;
      }

      // Show all pollinations matching the emoji number(s) (show only emoji number(s), not sequential number)
      const pollinationList = pollinations.map((row: any) => {
        const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
        const contentInfo = row.content_numbers ? ` (emoji: ${row.content_numbers})` : '';
        return `<@${row.userId}>${contentInfo} [jump](${link})`;
      });

      let header = `Pollinations for emoji number(s) ${emojiNumbers.length === 1 ? emojiNumbers[0] : emojiNumbers[0] + '-' + emojiNumbers[emojiNumbers.length-1]}:`;
      let reply = header + '\n' + pollinationList.join('\n');

      if (reply.length <= 2000) {
        await interaction.editReply({ content: reply });
      } else {
        // If too long, send as a file
        const fileContent = header + '\n' + pollinationList.join('\n');
        await interaction.editReply({
          content: `Too many pollinations to display in chat. See attached file.`,
          files: [{ attachment: Buffer.from(fileContent, 'utf-8'), name: `pollinations_emoji_${emojiNumbers[0]}${emojiNumbers.length > 1 ? '-' + emojiNumbers[emojiNumbers.length-1] : ''}.txt` }]
        });
      }
    } catch (error) {
      console.error('Error in check_pollination command:', error);
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ content: '❌ An error occurred while processing your request.' });
        } else if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred while processing your request.' });
        }
      } catch (replyError) {
        console.error('Failed to send error response:', replyError);
      }
    }
  }
};
