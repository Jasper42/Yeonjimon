import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';
import { adminUserIds } from '../utils/botConstants';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

export const adminResetPollinationProgressCommand: Command = {
  name: 'x_admin_resetpollinationprogress',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.' });
      return;
    }
    const channelId = '1306306027767205971';
    try {
      // Remove all pollinations
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM pollinations', err => {
          if (err) return reject(err);
          resolve();
        });
      });
      // Reset progress
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE pollination_progress SET last_id = NULL WHERE channel_id = ?', [channelId], err => {
          if (err) return reject(err);
          resolve();
        });
      });
      await interaction.reply({ content: '✅ All pollinations removed and progress reset. The next scan will start from the beginning.' });
    } catch (err) {
      console.error('❌ Failed to reset pollination progress:', err);
      await interaction.reply({ content: '❌ Failed to reset pollination progress.' });
    }
  }
};
