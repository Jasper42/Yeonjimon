import { Command, CommandContext } from './types';
import { TextChannel } from 'discord.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { adminUserIds } from '../utils/botConstants';

// Use the same db as pointsManager
const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

// Ensure pollination_progress table exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS pollination_progress (
    channel_id TEXT PRIMARY KEY,
    last_id TEXT
  )`);
});

// Helper: Parse pollination numbers from message content
function extractPollinationNumbers(content: string): number[] {
  const emojiToDigit: Record<string, string> = {
    '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
    '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  };

  // Match all consecutive digit emoji sequences (optionally separated by spaces)
  // This will match things like "6️⃣9️⃣", "6️⃣ 9️⃣", but not across non-emoji chars like "+"
  const matches = content.match(/([0-9]️⃣ ?)+/g);
  if (!matches) return [];

  const numbers: number[] = [];
  for (const match of matches) {
    // Remove spaces, then split into emojis
    const digits = match.replace(/ /g, '').match(/[0-9]️⃣/g);
    if (digits && digits.length > 0) {
      const numStr = digits.map(e => emojiToDigit[e]).join('');
      const num = parseInt(numStr);
      if (!isNaN(num) && num > 0) {
        numbers.push(num);
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(numbers)].sort((a, b) => a - b);
}

// Helper: Get next available pollination number
async function getNextPollinationNumber(): Promise<number> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT MAX(pollination_number) as max_num FROM pollinations',
      [],
      (err, row: any) => {
        if (err) return reject(err);
        resolve((row?.max_num || 0) + 1);
      }
    );
  });
}

// Helper: Insert pollination into database with sequential numbering
async function insertPollination(userId: string, messageId: string, timestamp: number, contentNumbers: string, nextPollinationNumber: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO pollinations (userId, pollination_number, message_id, timestamp, content_numbers) VALUES (?, ?, ?, ?, ?)`,
      [userId, nextPollinationNumber, messageId, timestamp, contentNumbers],
      function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });
}

// Helper: Get scan progress
async function getScanProgress(channelId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT last_id FROM pollination_progress WHERE channel_id = ?',
      [channelId],
      (err, row: any) => {
        if (err) return reject(err);
        resolve(row?.last_id || null);
      }
    );
  });
}

// Helper: Update scan progress
async function updateScanProgress(channelId: string, lastId: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO pollination_progress (channel_id, last_id) VALUES (?, ?)',
      [channelId, lastId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
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


    const channelId = '1306306027767205971';
    const channel = interaction.guild?.channels.cache.get(channelId) as TextChannel | undefined;
    
    if (!channel) {
      await interaction.reply({ content: '❌ Pollination channel not found.' });
      return;
    }

    await interaction.reply({ 
      content: `⏳ Starting pollination scan...` 
    });

    try {

    // Get current progress and next pollination number
    const lastProcessedId = await getScanProgress(channelId);
    let nextPollinationNumber = await getNextPollinationNumber();

    let messagesProcessed = 0;
    let pollinationsInserted = 0;
    let allMessages: any[] = [];
    let beforeId: string | undefined = undefined;
    let done = false;

    // First, collect ALL messages in the channel from oldest to newest
    await interaction.editReply({
      content: `⏳ Collecting all messages from channel... (this may take a while)`
    });

    // Collect all messages first (going backwards through channel)
    while (!done) {
      const fetchOptions: any = { limit: 100 };
      if (beforeId) {
        fetchOptions.before = beforeId;
      }

      const messagesBatch: any = await channel.messages.fetch(fetchOptions);

      if (!messagesBatch || messagesBatch.size === 0) {
        done = true;
        break;
      }

      const messages = Array.from(messagesBatch.values()) as any[];
      allMessages.push(...messages);

      // Update progress
      if (allMessages.length % 500 === 0) {
        await interaction.editReply({
          content: `⏳ Collected ${allMessages.length} messages so far...`
        });
      }

      // Set beforeId to the oldest message in this batch for next iteration
      if (messages.length > 0) {
        const oldestMessage = messages.reduce((oldest, current) =>
          current.createdTimestamp < oldest.createdTimestamp ? current : oldest
        );
        beforeId = oldestMessage.id;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1100));

      if (messagesBatch.size < 100) {
        done = true;
      }
    }

    // Sort messages chronologically (oldest first)
    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    await interaction.editReply({
      content: `⏳ Collected ${allMessages.length} messages. Now processing chronologically starting from pollination #${nextPollinationNumber}...`
    });

    // Process messages chronologically, skipping if we're resuming
    let startIndex = 0;
    if (lastProcessedId) {
      const lastIndex = allMessages.findIndex(msg => msg.id === lastProcessedId);
      if (lastIndex !== -1) {
        startIndex = lastIndex + 1; // Start after the last processed message
        await interaction.editReply({
          content: `⏳ Resuming from message ${startIndex + 1}/${allMessages.length} (pollination #${nextPollinationNumber})...`
        });
      }
    }

    // Process messages and assign sequential pollination numbers
    for (let i = startIndex; i < allMessages.length; i++) {
      const message = allMessages[i];
      messagesProcessed++;
      const messageTimestamp = Math.floor(message.createdTimestamp / 1000);

      // Extract pollination numbers from message content
      const pollinationNumbers = extractPollinationNumbers(message.content);

      // If this message contains any pollination numbers, assign sequential numbers
      if (pollinationNumbers.length > 0) {
        const contentNumbers = pollinationNumbers.join(', ');

        // Assign one pollination number per message (even if multiple numbers in content)
        try {
          const wasInserted = await insertPollination(
            message.author.id,
            message.id,
            messageTimestamp,
            contentNumbers,
            nextPollinationNumber
          );
          if (wasInserted) {
            pollinationsInserted++;
            nextPollinationNumber++; // Increment for next pollination
          }
        } catch (error) {
          console.error(`Error inserting pollination #${nextPollinationNumber} for message ${message.id}:`, error);
        }
      }

      // Progress update every 100 messages
      if (messagesProcessed % 100 === 0) {
        await interaction.editReply({
          content: `⏳ Processing... ${messagesProcessed}/${allMessages.length - startIndex} messages, found ${pollinationsInserted} pollinations (next: #${nextPollinationNumber})`
        });

        // Save progress periodically
        if (messagesProcessed % 500 === 0) {
          await updateScanProgress(channelId, message.id);
        }
      }

      // Small delay to avoid overwhelming the database
      if (messagesProcessed % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Save final progress
    if (allMessages.length > 0) {
      const lastMessage = allMessages[allMessages.length - 1];
      await updateScanProgress(channelId, lastMessage.id);
    }

    await interaction.editReply({
      content: `✅ Scan complete! Processed ${messagesProcessed} messages, assigned ${pollinationsInserted} sequential pollination numbers (ending at #${nextPollinationNumber - 1}).`
    });

    } catch (error) {
      console.error('Error in pollination scan:', error);
      await interaction.editReply({ content: '❌ Error occurred during pollination scan.' });
    }
  }
};
