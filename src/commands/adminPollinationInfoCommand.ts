import { Command, CommandContext } from './types';
import { db } from '../utils/pointsManager';
import { TextChannel, MessageFlags } from 'discord.js';

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
      // Reply immediately with loading message (admin command, so ephemeral)
      console.log('Replying to check_pollination command...');
      await interaction.reply({ content: '⏳ Processing admin command...', flags: MessageFlags.Ephemeral });
      console.log('Successfully sent initial reply.');
      
      const pollinationNumberOption = interaction.options.get('number');
      const userOption = interaction.options.get('user');
      const channelId = '1306306027767205971';
      const guildId = interaction.guildId;

      // If user option is provided, list all pollinations by that user
      if (userOption && userOption.user && userOption.user.id) {
        const userId = userOption.user.id;
        
        await interaction.followUp({ content: '⏳ Searching for pollinations...', flags: MessageFlags.Ephemeral });
        
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
          await interaction.followUp({ content: `No pollinations found for <@${userId}>.`, flags: MessageFlags.Ephemeral });
          return;
        }
        
        // Build pollination list as lines (show only emoji number(s), not sequential number)
        const pollinationList = pollinations.map((row: any) => {
          const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
          const contentInfo = row.content_numbers ? ` (Pollination #: ${row.content_numbers})` : '';
          return `${contentInfo} [jump](${link})`;
        });

        let header = `<@${userId}> has ${pollinations.length} pollinations:`;
        let reply = header + '\n' + pollinationList.join('\n');
        
        if (reply.length <= 2000) {
          await interaction.followUp({ content: reply, flags: MessageFlags.Ephemeral });
        } else {
          // If too long, send as a file
          const fileContent = header + '\n' + pollinationList.join('\n');
          await interaction.followUp({
            content: reply,
            files: [{ attachment: Buffer.from(reply, 'utf8'), name: `pollinations_for_${userId}.txt` }],
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      // Support single emoji number or range (e.g., 50 or 50-60) for content_numbers
      if (!pollinationNumberOption || !pollinationNumberOption.value) {
        await interaction.followUp({ content: 'Please provide a valid Pollination number, range, or user.', flags: MessageFlags.Ephemeral });
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
        await interaction.followUp({ content: 'Please provide a valid Pollination number or range (e.g., 50 or 50-60).', flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.followUp({ content: '⏳ Looking up pollination(s)...', flags: MessageFlags.Ephemeral });

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
        await interaction.followUp({ content: `No pollinations found for number(s) ${emojiNumbers.length === 1 ? emojiNumbers[0] : emojiNumbers[0] + '-' + emojiNumbers[emojiNumbers.length-1]}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      // Show all pollinations matching the emoji number(s) (show only emoji number(s), not sequential number)
      const pollinationList = pollinations.map((row: any) => {
        const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
        const contentInfo = row.content_numbers ? ` (Pollination #: ${row.content_numbers})` : '';
        return `<@${row.userId}>${contentInfo} [jump](${link})`;
      });

      let header = `Pollinations for number(s) ${emojiNumbers.length === 1 ? emojiNumbers[0] : emojiNumbers[0] + '-' + emojiNumbers[emojiNumbers.length-1]}:`;
      let reply = header + '\n' + pollinationList.join('\n');

      if (reply.length <= 2000) {
        await interaction.followUp({ content: reply, flags: MessageFlags.Ephemeral });
      } else {
        // If too long, send as a file
        const fileContent = header + '\n' + pollinationList.join('\n');
        await interaction.followUp({
          content: reply,
          files: [{ attachment: Buffer.from(reply, 'utf8'), name: `pollinations_${emojiNumbers.length === 1 ? emojiNumbers[0] : emojiNumbers[0] + '-' + emojiNumbers[emojiNumbers.length-1]}.txt` }],
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error('Error in check_pollination command:', error);
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.followUp({ content: '❌ An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
        } else if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred while processing your request.' });
        }
      } catch (replyError) {
        console.error('Failed to send error response:', replyError);
      }
    }
  }
};
