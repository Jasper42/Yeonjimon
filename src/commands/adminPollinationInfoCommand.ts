import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';
import { TextChannel } from 'discord.js';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

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
            'SELECT * FROM pollinations WHERE userId = ? ORDER BY pollination_number ASC',
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
        
        // Build pollination list as lines
        const pollinationList = pollinations.map((row: any) => {
          const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
          const contentInfo = row.content_numbers ? ` (content: ${row.content_numbers})` : '';
          return `#${row.pollination_number}${contentInfo} [jump](${link})`;
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

      // Support single number or range (e.g., 50 or 50-60)
      if (!pollinationNumberOption || !pollinationNumberOption.value) {
        await interaction.editReply({ content: 'Please provide a valid pollination number, range, or user.' });
        return;
      }
      
      let numberInput = pollinationNumberOption.value as string; // Always a string from StringOption
      let from: number | null = null;
      let to: number | null = null;
      
      if (numberInput.includes('-')) {
        // Range input as string, e.g., '50-60'
        const parts = numberInput.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          from = Math.min(parts[0], parts[1]);
          to = Math.max(parts[0], parts[1]);
        }
      } else {
        // Single number as string
        const singleNumber = parseInt(numberInput.trim(), 10);
        if (!isNaN(singleNumber)) {
          from = to = singleNumber;
        }
      }
      
      if (from === null || to === null) {
        await interaction.editReply({ content: 'Please provide a valid pollination number or range (e.g., 50 or 50-60).' });
        return;
      }
      
      await interaction.editReply({ content: '⏳ Looking up pollination(s)...' });
      
      // Wrap database query in Promise to properly handle async
      const pollinations = await new Promise<any[]>((resolve, reject) => {
        db.all(
          'SELECT * FROM pollinations WHERE pollination_number >= ? AND pollination_number <= ? ORDER BY pollination_number ASC',
          [from, to],
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
        await interaction.editReply({ content: `No pollinations found for number(s) ${from === to ? from : from + '-' + to}.` });
        return;
      }
      
      if (from === to && pollinations.length === 1) {
        // Single pollination
        const row = pollinations[0];
        const messageId = row.message_id;
        const userId = row.userId;
        const contentNumbers = row.content_numbers;
        const link = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
        const contentInfo = contentNumbers ? ` (original numbers: ${contentNumbers})` : '';
        await interaction.editReply({
          content: `Pollination #${from} by <@${userId}>${contentInfo}\n[Jump to message](${link})`
        });
      } else {
        // Range: show all pollinations in range
        const pollinationList = pollinations.map((row: any) => {
          const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
          const contentInfo = row.content_numbers ? ` (${row.content_numbers})` : '';
          return `#${row.pollination_number} by <@${row.userId}>${contentInfo} [jump](${link})`;
        });
        
        let header = `Pollinations for numbers ${from}-${to}:`;
        let reply = header + '\n' + pollinationList.join('\n');
        
        if (reply.length <= 2000) {
          await interaction.editReply({ content: reply });
        } else {
          // If too long, send as a file
          const fileContent = header + '\n' + pollinationList.join('\n');
          await interaction.editReply({
            content: `Too many pollinations to display in chat. See attached file.`,
            files: [{ attachment: Buffer.from(fileContent, 'utf-8'), name: `pollinations_${from}-${to}.txt` }]
          });
        }
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
