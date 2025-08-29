import { Command, CommandContext } from './types';
import sqlite3 from 'sqlite3';
import path from 'path';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';
import { MessageFlags } from 'discord.js';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

export const pollinationLeaderboardCommand: Command = {
  name: 'pollination_leaderboard',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    
    // Reply immediately with a loading message
    await interaction.reply({ content: '🌸 Loading pollination leaderboard...', flags: MessageFlags.Ephemeral });
    
    db.all(
      'SELECT userId, COUNT(*) as pollinations FROM pollinations GROUP BY userId ORDER BY pollinations DESC LIMIT 10',
      [],
      async (err, rows) => {
        if (err) {
          await interaction.followUp({ content: '❌ Database error.' });
          return;
        }

        let pollinationBoard = '```\n';
        pollinationBoard += 'Rank   | Pollinator        | Pollinations\n';
        pollinationBoard += '------------------------------------------\n';
        if (!rows || rows.length === 0) {
          pollinationBoard += 'No pollinations yet!\n';
        } else {
          for (let i = 0; i < rows.length; i++) {
            const entry = rows[i] as { userId: string, pollinations: number };
            let leaderboardRank;
            if (i === 0) leaderboardRank = '1st 🥇';
            else if (i === 1) leaderboardRank = '2nd 🥈';
            else if (i === 2) leaderboardRank = '3rd 🥉';
            else leaderboardRank = `#${i + 1}`;
            const rank = leaderboardRank.padEnd(6);
            let pollinatorUser = `<@${entry.userId}>`;
            try {
              const user = await interaction.client.users.fetch(entry.userId);
              pollinatorUser = user.displayName ? user.displayName : user.username;
            } catch {
              // fallback to mention if user not found
            }
            pollinatorUser = pollinatorUser.padEnd(17).substring(0, 17);
            const pollinationCount = entry.pollinations.toString().padEnd(12);
            pollinationBoard += `${rank} | ${pollinatorUser} | ${pollinationCount}\n`;
          }
        }
        pollinationBoard += '```';
        const pollinationEmbed = new SimpleEmbedBuilder()
          .setTitle('🌸 Pollination Leaderboard')
          .setDescription('Top pollinators by number of pollinations.');
        pollinationEmbed.addField('Top Pollinators', pollinationBoard);
        await interaction.followUp({ embeds: [pollinationEmbed.build()] });
      }
    );
  }
};
