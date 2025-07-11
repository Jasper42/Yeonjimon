import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

export const adminTotalPollinationsCommand: Command = {
  name: 'x_admin_totalpollinations',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    db.get('SELECT COUNT(*) as total FROM pollinations', [], async (err, row) => {
      if (err) {
        await interaction.reply({ content: '❌ Database error.' });
        return;
      }
      const total = row ? (row as any).total : 0;
      await interaction.reply({ content: `There are currently **${total}** pollinations in the database.` });
    });
  }
};
