import { Command, CommandContext } from './types';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';
import { 
  getUserAchievementProgress, 
  getAchievementsByCategory, 
  Achievement,
  checkAndUnlockAchievements
} from '../utils/achievementUtils';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';

export const achievementsCommand: Command = {
  name: 'achievements',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    
    try {
      // Reply immediately with loading message
      await interaction.reply({ content: '🏆 Loading achievements...', flags: MessageFlags.Ephemeral });

      // Determine which user's achievements to show
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;
      const username = targetUser.username;

      // Defer achievement checking to avoid blocking
      setImmediate(async () => {
        try {
          await checkAndUnlockAchievements(userId, username);
        } catch (error) {
          console.error('Error checking achievements:', error);
        }
      });

      // Get user's achievement progress
      const progress = await getUserAchievementProgress(userId);

      // Create main overview embed
      const overviewEmbed = new SimpleEmbedBuilder()
        .setTitle(`🏅 ${username}'s Achievements`)
        .setColor('#FFD700')
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addField(
          '📊 **Overall Progress**', 
          `${progress.totalUnlocked}/${progress.totalPossible} achievements unlocked (${Math.round((progress.totalUnlocked / progress.totalPossible) * 100)}%)`,
          false
        );

      // Add category overview
      let categoryOverview = '';
      const categories = [
        { key: 'pollination', name: 'Pollinations', emoji: '🌸' },
        { key: 'games', name: 'Games', emoji: '🎮' },
        { key: 'points', name: 'Points', emoji: '💎' },
        { key: 'money', name: 'Money', emoji: '💰' },
        { key: 'levels', name: 'Levels', emoji: '🏅' }
      ];

      for (const category of categories) {
        const categoryData = progress.byCategory[category.key];
        if (categoryData) {
          const percentage = Math.round((categoryData.unlocked.length / categoryData.total) * 100);
          categoryOverview += `${category.emoji} **${category.name}**: ${categoryData.unlocked.length}/${categoryData.total} (${percentage}%)\n`;
        }
      }

      overviewEmbed.addField('📋 **Categories**', categoryOverview, false);

      // Add recently unlocked achievements (if any)
      if (progress.unlocked.length > 0) {
        const recentAchievements = progress.unlocked.slice(-3); // Last 3 achievements
        const recentText = recentAchievements.map(a => `${a.emoji} **${a.name}**`).join('\n');
        overviewEmbed.addField('🆕 **Recent Achievements**', recentText, false);
      }

      // Create category buttons
      const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('achievements_pollination')
            .setLabel('Pollinations 🌸')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('achievements_games')
            .setLabel('Games 🎮')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('achievements_points')
            .setLabel('Points 💎')
            .setStyle(ButtonStyle.Secondary)
        );

      const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('achievements_money')
            .setLabel('Money 💰')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('achievements_levels')
            .setLabel('Levels 🏅')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('achievements_overview')
            .setLabel('Overview 📊')
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.followUp({
        embeds: [overviewEmbed.build()],
        components: [row1, row2]
      });

      // Handle button interactions
      const collector = interaction.channel?.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 60000
      });

      collector?.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();

        const [, category] = buttonInteraction.customId.split('_');

        if (category === 'overview') {
          await buttonInteraction.editReply({
            embeds: [overviewEmbed.build()],
            components: [row1, row2]
          });
          return;
        }

        // Create category-specific embed
        const categoryAchievements = getAchievementsByCategory(category as Achievement['category']);
        const unlockedIds = new Set(progress.unlocked.map(a => a.id));

        const categoryEmbed = new SimpleEmbedBuilder()
          .setTitle(`🏅 ${username}'s ${category.charAt(0).toUpperCase() + category.slice(1)} Achievements`)
          .setColor('#FFD700')
          .setThumbnail(targetUser.displayAvatarURL({ size: 256 }));

        let achievementText = '';
        let unlockedCount = 0;

        for (const achievement of categoryAchievements) {
          const isUnlocked = unlockedIds.has(achievement.id);
          if (isUnlocked) unlockedCount++;
          
          const status = isUnlocked ? '✅' : '❌';
          const tierText = getTierText(achievement.tier);
          achievementText += `${status} ${achievement.emoji} **${achievement.name}** ${tierText}\n`;
          achievementText += `    *${achievement.description}*\n\n`;
        }

        categoryEmbed.addField(
          `Progress: ${unlockedCount}/${categoryAchievements.length}`,
          achievementText || 'No achievements in this category yet.',
          false
        );

        await buttonInteraction.editReply({
          embeds: [categoryEmbed.build()],
          components: [row1, row2]
        });
      });

      collector?.on('end', async () => {
        try {
          await interaction.followUp({
            components: []
          });
        } catch (error) {
          // Interaction might have expired
        }
      });

    } catch (error) {
      console.error('❌ Error fetching achievements:', error);
      await interaction.followUp({ content: '❌ Failed to load achievements.' });
    }
  }
};

function getTierText(tier: number): string {
  switch (tier) {
    case 1: return '🥉';
    case 2: return '🥈';
    case 3: return '🥇';
    case 4: return '💎';
    case 5: return '👑';
    default: return '';
  }
}
