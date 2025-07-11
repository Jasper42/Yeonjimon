import { Command, CommandContext } from './types';
import { TextChannel } from 'discord.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { adminUserIds } from '../utils/botConstants';
import fs from 'fs';

// Use the same db as pointsManager
const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

// Ensure pollination_progress table exists
const progressTableSql = `CREATE TABLE IF NOT EXISTS pollination_progress (
  channel_id TEXT PRIMARY KEY,
  last_id TEXT
)`;
db.run(progressTableSql);

// Helper: Insert pollination (ignore if duplicate)
function insertPollination(userId: string, pollination_number: number, message_id: string, timestamp: number) {
  db.run(
    `INSERT OR IGNORE INTO pollinations (userId, pollination_number, message_id, timestamp) VALUES (?, ?, ?, ?)`,
    [userId, pollination_number, message_id, timestamp]
  );
}

// Helper: Parse pollination numbers from message content
function extractPollinationNumbers(content: string): number[] {
  // Map emoji to digit
  const emojiToDigit: Record<string, string> = {
    '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
    '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  };
  // Match all emoji digits (optionally separated by space)
  const matches = content.match(/([0-9]️⃣)(\s*[0-9]️⃣)*/g);
  if (!matches) return [];
  const numbers: number[] = [];
  for (const match of matches) {
    // Remove spaces, split into emoji, map to digits, join
    const digits = match.replace(/\s+/g, '').match(/[0-9]️⃣/g);
    if (digits) {
      const numStr = digits.map(e => emojiToDigit[e]).join('');
      if (numStr && !isNaN(Number(numStr))) numbers.push(Number(numStr));
    }
  }
  // Remove duplicates
  return [...new Set(numbers)];
}

// Helper: Get last processed message ID from DB
function getLastProcessedId(channelId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT last_id FROM pollination_progress WHERE channel_id = ?', [channelId], (err, row) => {
      if (err) return reject(err);
      resolve(row && typeof row === 'object' && row !== null && 'last_id' in row ? (row as any).last_id : null);
    });
  });
}
// Helper: Set last processed message ID in DB
function setLastProcessedId(channelId: string, lastId: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO pollination_progress (channel_id, last_id) VALUES (?, ?)', [channelId, lastId], err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export const adminCountPollinationsCommand: Command = {
  name: 'x_admin_countpollinations',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.' });
      return;
    }
    // Get maxCount from command options, default to 1000 if not provided
    let maxCount: number | 'all' = 1000;
    const countOption = interaction.options.get('count');
    if (countOption) {
      if (typeof countOption.value === 'number' && countOption.value === 0) {
        maxCount = 'all';
      } else if (typeof countOption.value === 'string' && countOption.value.toLowerCase() === 'all') {
        maxCount = 'all';
      } else if (typeof countOption.value === 'number') {
        maxCount = countOption.value;
      }
    }
    await interaction.reply({ content: `⏳ Counting up to ${maxCount === 'all' ? 'ALL' : maxCount} pollination messages, this may take a while...` });
    try {
      const channelId = '1306306027767205971';
      const channel = interaction.guild?.channels.cache.get(channelId) as TextChannel | undefined;
      if (!channel) {
        await interaction.editReply({ content: '❌ Pollination channel not found.' });
        return;
      }
      // Get last processed message ID from DB
      let lastId: string | undefined = await getLastProcessedId(channelId) || undefined;
      // If this is the first run, get the oldest message ID to start from
      if (!lastId) {
        const oldestMsg = await channel.messages.fetch({ limit: 1, after: '0' });
        if (oldestMsg && oldestMsg.size > 0 && oldestMsg.first() && oldestMsg.first()!.id) {
          lastId = oldestMsg.first()!.id;
        }
      }
      let totalProcessed = 0;
      let totalInserted = 0;
      let done = false;
      let newLastId: string | undefined = lastId;
      // Track seen pollination numbers to enforce uniqueness
      const seenNumbers = new Set<number>();
      while (!done && (maxCount === 'all' || totalProcessed < maxCount)) {
        const options: any = { limit: 100 };
        if (maxCount !== 'all') options.limit = Math.min(100, maxCount - totalProcessed);
        if (newLastId) options.after = newLastId;
        const msgCollection: any = await channel.messages.fetch(options);
        if (!msgCollection || msgCollection.size === 0) break;
        const sortedMsgs = Array.from(msgCollection.values()).sort((a: any, b: any) => a.createdTimestamp - b.createdTimestamp);
        for (const msg of sortedMsgs) {
          const message = msg as any;
          if (maxCount !== 'all' && totalProcessed >= maxCount) {
            break;
          }
          totalProcessed++;
          const pollinationNumbers = extractPollinationNumbers(message.content);
          for (const number of pollinationNumbers) {
            if (!seenNumbers.has(number)) {
              insertPollination(message.author.id, number, message.id, Math.floor(message.createdTimestamp / 1000));
              seenNumbers.add(number);
              totalInserted++;
            }
          }
          newLastId = message.id;
          // Progress update every 50 processed
          if (totalProcessed % 50 === 0) {
            await interaction.editReply({ content: `⏳ Still counting... Processed ${totalProcessed} messages, inserted ${totalInserted} pollinations so far.` });
          }
        }
        await new Promise(res => setTimeout(res, 1100));
        if (msgCollection.size < 100 || (maxCount !== 'all' && totalProcessed >= maxCount)) done = true;
      }
      // Save new last processed message ID to DB
      await setLastProcessedId(channelId, newLastId ?? null);
      await interaction.editReply({ content: `✅ Pollination scan complete! Processed ${totalProcessed} messages, inserted ${totalInserted} pollinations.` });
    } catch (err) {
      console.error('Error counting pollinations:', err);
      await interaction.editReply({ content: '❌ Error counting pollinations.' });
    }
  }
};
