import { Command, CommandContext } from './types';
import { getUserProfile, getProfileRank, getTotalServerGames } from '../utils/pointsManager';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';

export const guesserProfileCommand: Command = {
  name: 'guesser_profile',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    try {
      // Defer reply for processing time
      await interaction.deferReply();

      const profile = await getUserProfile(userId);
      if (!profile) {
        await interaction.editReply('❌ No profile found. Play some games to create your profile!');
        return;
      }

      // Check if user has actually played any games
      if (profile.gamesStarted === 0 && profile.gamesWon === 0 && 
          profile.pointsFromStarting === 0 && profile.pointsFromAssists === 0 && 
          profile.pointsFromWinning === 0 && profile.totalPoints === 0) {
        await interaction.editReply('❌ No gaming history found. Start or participate in some idol guessing games to build your profile!');
        return;
      }

      const rank = await getProfileRank(userId);
      const totalServerGames = await getTotalServerGames();
      
      // Calculate win rate: games won by player vs total games played on server
      const winRate = totalServerGames > 0 
        ? Math.round((profile.gamesWon / totalServerGames) * 100)
        : 0;
      
      const totalPointsEarned = profile.pointsFromStarting + profile.pointsFromAssists + profile.pointsFromWinning;
      const totalMoneyEarned = profile.moneyFromStarting + profile.moneyFromAssists + profile.moneyFromWinning;

      const embed = new SimpleEmbedBuilder()
        .setTitle(`🎮 ${profile.username}'s Profile`)
        .setColor('#FF6B9D') // Nice pink color
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .addField('🎯 **Games Started**', 
          `You've started \`${profile.gamesStarted}\` games`, 
          false
        )
        .addField('📈 **Win Rate**', 
          `🏆 **${winRate}%** - You've won \`${profile.gamesWon}\` out of \`${totalServerGames}\` total server games`, 
          false
        )
        .addField('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', false)
        .addField('💎 **Total Points & Rank**', 
          `💎 **Total Points:** \`${totalPointsEarned}\`\n🏅 **Current Rank:** \`#${rank}\``,
          false
        )
        .addField('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', false)
        .addField('⭐ **Points Breakdown**', 
          `🥇 **From Winning:** \`${profile.pointsFromWinning}\`\n` +
          `🤝 **From Assists:** \`${profile.pointsFromAssists}\`\n` + 
          `🎮 **From Starting Games:** \`${profile.pointsFromStarting}\``,
          false
        )
        .addField('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', false)
        .addField('💰 **Money from Games**', 
          `🥇 **From Winning:** \`${profile.moneyFromWinning}\` coins\n` +
          `🤝 **From Assists:** \`${profile.moneyFromAssists}\` coins\n` +
          `🎮 **From Starting:** \`${profile.moneyFromStarting}\` coins\n` +
          `\n💸 **Total Earned:** \`${totalMoneyEarned}\` coins`, 
          false
        )
        .setFooter(`Requested by ${interaction.user.username}`, interaction.user.displayAvatarURL({ size: 32 }));

      await interaction.editReply({ embeds: [embed.build()] });

    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      await interaction.editReply('❌ Failed to load profile. Please try again.');
    }
  }
};
