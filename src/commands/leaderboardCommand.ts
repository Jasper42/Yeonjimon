import { Command, CommandContext } from './types';
import { getLeaderboard, LeaderboardEntry } from '../utils/pointsManager';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  execute: async (context: CommandContext) => {
    const { interaction } = context;

    const showIds = interaction.options.getBoolean('showids');
    const leaderboard: LeaderboardEntry[] = await getLeaderboard();

    const topPerformers = leaderboard.slice(0, 10);

    let leaderboardContent = '```\n';
    leaderboardContent += 'Rank   | Username          | Points';
    if (showIds) {
        leaderboardContent += ' | User ID';
    }
    leaderboardContent += '\n---------------------------------------\n';

    if (topPerformers.length === 0) {
        leaderboardContent += 'No one has played yet!\n```';
    } else {
        topPerformers.forEach((entry, i) => {
            let rankDisplay;
            if (i === 0) {
                rankDisplay = '1st 🥇';
            } else if (i === 1) {
                rankDisplay = '2nd 🥈';
            } else if (i === 2) {
                rankDisplay = '3rd 🥉';
            } else {
                rankDisplay = `#${i + 1}`;
            }
            const rank = rankDisplay.padEnd(6);
            const username = entry.username.padEnd(17).substring(0, 17);
            const points = entry.points.toString().padEnd(6);
            let line = `${rank} | ${username} | ${points}`;
            if (showIds) {
                line += ` | ${entry.userId}`;
            }
            leaderboardContent += `${line}\n`;
        });
        leaderboardContent += '```';
    }

    const leaderboardEmbed = new SimpleEmbedBuilder()
      .setTitle('📊 Guess-the-Idol Leaderboard')
      .setDescription('Current standings for Guess-the-Idol.');

    leaderboardEmbed.addField('Top Players', leaderboardContent);

    await interaction.reply({ embeds: [leaderboardEmbed.build()] });
  }
};
