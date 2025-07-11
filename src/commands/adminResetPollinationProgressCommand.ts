import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';
import { adminUserIds } from '../utils/botConstants';

// Use the same db as pointsManager
const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

export const adminResetPollinationProgressCommand: Command = {
  name: 'x_admin_reset_pollinations',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.' });
      return;
    }

    await interaction.reply({ content: '⚠️ Are you sure you want to reset ALL pollination data? This cannot be undone! Use `/x_admin_reset_pollinations_yes` to confirm.' });
  }
};

export const adminResetPollinationProgressConfirmCommand: Command = {
  name: 'x_admin_reset_pollinations_yes',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.' });
      return;
    }

    try {
      // Clear all pollination data
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM pollinations', (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Clear progress tracking
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM pollination_progress', (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      await interaction.reply({ content: '✅ All pollination data has been reset. You can now run the pollination scan to rebuild the data with sequential numbering.' });
    } catch (error) {
      console.error('Error resetting pollination data:', error);
      await interaction.reply({ content: '❌ Error occurred while resetting pollination data.' });
    }
  }
};
