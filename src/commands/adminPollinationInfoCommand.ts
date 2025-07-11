import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';
import { TextChannel } from 'discord.js';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

export const checkPollinationCommand: Command = {
  name: 'check_pollination',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    const pollinationNumberOption = interaction.options.get('number');
    const userOption = interaction.options.get('user');
    const channelId = '1306306027767205971';
    const guildId = interaction.guildId;

    // If user option is provided, list all pollinations by that user
    if (userOption && userOption.user && userOption.user.id) {
      const userId = userOption.user.id;
      db.all(
        'SELECT * FROM pollinations WHERE userId = ? ORDER BY pollination_number ASC',
        [userId],
        async (err, rows) => {
          if (err) {
            await interaction.reply({ content: '❌ Database error.' });
            return;
          }
          if (!rows || rows.length === 0) {
            await interaction.reply({ content: `No pollinations found for <@${userId}>.` });
            return;
          }
          // Build pollination list as lines
          const pollinationList = rows.map((row: any) => {
            const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
            return `#${row.pollination_number} [jump](${link})`;
          });
          let header = `<@${userId}> has ${rows.length} pollinations:`;
          let reply = header + '\n' + pollinationList.join('\n');
          if (reply.length <= 2000) {
            await interaction.reply({ content: reply, allowedMentions: { users: [] } });
          } else {
            // If too long, send as a file
            const fileContent = header + '\n' + pollinationList.join('\n');
            await interaction.reply({
              content: `<@${userId}> has too many pollinations to display in chat. See attached file.`,
              files: [{ attachment: Buffer.from(fileContent, 'utf-8'), name: `pollinations_${userId}.txt` }],
              allowedMentions: { users: [] }
            });
          }
        }
      );
      return;
    }

    // Support single number or range (e.g., 50 or 50-60)
    if (!pollinationNumberOption || (!pollinationNumberOption.value && pollinationNumberOption.value !== 0)) {
      await interaction.reply({ content: 'Please provide a valid pollination number, range, or user.' });
      return;
    }
    let numberInput = pollinationNumberOption.value;
    let from: number | null = null;
    let to: number | null = null;
    if (typeof numberInput === 'string' && numberInput.includes('-')) {
      // Range input as string, e.g., '50-60'
      const parts = numberInput.split('-').map(s => parseInt(s.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        from = Math.min(parts[0], parts[1]);
        to = Math.max(parts[0], parts[1]);
      }
    } else if (typeof numberInput === 'number') {
      from = to = numberInput;
    }
    if (from === null || to === null) {
      await interaction.reply({ content: 'Please provide a valid pollination number or range (e.g., 50 or 50-60).' });
      return;
    }
    db.all(
      'SELECT * FROM pollinations WHERE pollination_number >= ? AND pollination_number <= ? ORDER BY pollination_number ASC',
      [from, to],
      async (err, rows) => {
        if (err) {
          await interaction.reply({ content: '❌ Database error.' });
          return;
        }
        if (!rows || rows.length === 0) {
          await interaction.reply({ content: `No pollinations found for number(s) ${from === to ? from : from + '-' + to}.` });
          return;
        }
        if (from === to && rows.length === 1) {
          // Single pollination
          const row = rows[0];
          const messageId = (row as any).message_id;
          const userId = (row as any).userId;
          const link = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
          await interaction.reply({
            content: `Pollination number ${from} by <@${userId}>\n[Jump to message](${link})`,
            allowedMentions: { users: [] }
          });
        } else {
          // Range: show all pollinations in range
          const pollinationList = rows.map((row: any) => {
            const link = `https://discord.com/channels/${guildId}/${channelId}/${row.message_id}`;
            return `#${row.pollination_number} by <@${row.userId}> [jump](${link})`;
          });
          let header = `Pollinations for numbers ${from}-${to}:`;
          let reply = header + '\n' + pollinationList.join('\n');
          if (reply.length <= 2000) {
            await interaction.reply({ content: reply, allowedMentions: { users: [] } });
          } else {
            // If too long, send as a file
            const fileContent = header + '\n' + pollinationList.join('\n');
            await interaction.reply({
              content: `Too many pollinations to display in chat. See attached file.`,
              files: [{ attachment: Buffer.from(fileContent, 'utf-8'), name: `pollinations_${from}-${to}.txt` }],
              allowedMentions: { users: [] }
            });
          }
        }
      }
    );
  }
};
