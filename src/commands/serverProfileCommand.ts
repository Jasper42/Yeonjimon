import { Command, CommandContext } from './types';
import { getTotalServerGames, getUserProfile } from '../utils/pointsManager';
import { getUserPollinationCount } from '../utils/pollinationUtils';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';
import { getUserBalance, getUserTotalBalance } from '../utils/unbelieva';
import { TextChannel, MessageFlags } from 'discord.js';
import config from '../config';
import { 
  getUserAchievementProgress, 
  getCategoryDisplayEmojis,
  checkAndUnlockAchievements 
} from '../utils/achievementUtils';

export const serverProfileCommand: Command = {
  name: 'server_profile',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    try {
      // Reply immediately with a loading message - do NOTHING else first
      await interaction.reply({ content: '📊 Loading server profile...', flags: MessageFlags.Ephemeral });

      // Now do all the work after acknowledging the interaction
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;
      const username = targetUser.username;
      const avatarUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL() : '';

      // Defer heavy operations to avoid blocking
      setImmediate(async () => {
        try {
          // Check for new achievements
          await checkAndUnlockAchievements(userId, username, interaction.client);
        } catch (error) {
          console.error('Error checking achievements:', error);
        }
      });

      // Fetch server-wide stats
      const totalGames = await getTotalServerGames();

      // Fetch user's pollination count and Unbelievaboat balance
      let pollinationCountText = '[Unavailable]';
      try {
        const pollinationCount = await getUserPollinationCount(userId);
        pollinationCountText = `${pollinationCount}`;
      } catch (err) {
        // leave as unavailable
      }
      let serverMoneyText = '[Unavailable]';
      const userBalance = await getUserTotalBalance(userId);
      if (userBalance !== null) {
        serverMoneyText = `${userBalance}`;
      }

      // Fetch the user's level by searching for their user ID in the specified channel's messages
      let serverLevelText = 'Unavailable';
      try {
        const levelChannelId = config.LEVEL_CHANNEL_ID;
        const levelChannel = interaction.guild?.channels.cache.get(levelChannelId) as TextChannel | undefined;
        if (levelChannel) {
          const messages = await levelChannel.messages.fetch({ limit: 50 });
          const userMentionRegex = new RegExp(`<@!?${userId}> has advanced to level (\\d+)`);
          let highestLevel = 0;
          messages.forEach(msg => {
            const match = msg.content.match(userMentionRegex);
            if (match) {
              const level = parseInt(match[1], 10);
              if (level > highestLevel) {
                highestLevel = level;
              }
            }
          });
          if (highestLevel > 0) {
            serverLevelText = `Level: ${highestLevel}`;
          }
        }
      } catch (err) {
        console.error('Error fetching user level:', err);
      }

      // Fetch user profile for bio and favorite idol
      const userProfile = await getUserProfile(userId);
      const bioText = userProfile?.bio ? userProfile.bio : '[No bio set. Use `/set_bio` to set one!]';
      const favoriteIdolName = userProfile?.favorite_idol_name || '';
      const favoriteIdolImage = userProfile?.favorite_idol_image_url || '';

      // Get achievement progress and display emojis
      const achievementProgress = await getUserAchievementProgress(userId);
      const pollinationEmoji = await getCategoryDisplayEmojis(userId, 'pollination');
      const gamesEmoji = await getCategoryDisplayEmojis(userId, 'games');
      const pointsEmoji = await getCategoryDisplayEmojis(userId, 'points');
      const moneyEmoji = await getCategoryDisplayEmojis(userId, 'money');
      const levelsEmoji = await getCategoryDisplayEmojis(userId, 'levels');

      const achievementDisplay = `${pollinationEmoji} ${gamesEmoji} ${pointsEmoji} ${moneyEmoji} ${levelsEmoji}\n` +
                                `${achievementProgress.totalUnlocked}/${achievementProgress.totalPossible} unlocked - Use \`/achievements\` for details`;

      const embed = new SimpleEmbedBuilder()
        .setTitle(`${username}'s profile`)
        .setColor('#6BCB77')
        .setThumbnail(avatarUrl || '')
        .addField('Bio', bioText, false)
        .addField('💰 **Your Money**', serverMoneyText, false)
        .addField('🏅 **Your Level**', serverLevelText, false)
        .addField('🌸 **Pollinations**', pollinationCountText, false)
        .addField('🎮 **Total Games Played**', `${totalGames}`, false)
        .addField('🏅 **Achievements**', achievementDisplay, false);

      if (favoriteIdolName) {
        embed.addField('Favorite Idol', favoriteIdolName, false);
      }
      if (favoriteIdolImage) {
        embed.setImage(favoriteIdolImage);
      }

      embed.setFooter('Server stats');

      await interaction.followUp({ embeds: [embed.build()] });
    } catch (error) {
      console.error('❌ Error fetching server profile:', error);
      await interaction.followUp({ content: '❌ Failed to load server profile.', flags: MessageFlags.Ephemeral });
    }
  }
};
