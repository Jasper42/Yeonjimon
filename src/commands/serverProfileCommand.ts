import { Command, CommandContext } from './types';
import { getTotalServerGames, getUserProfile } from '../utils/pointsManager';
import { getUserPollinationCount } from '../utils/pollinationUtils';
import { SimpleEmbedBuilder } from '../utils/embedBuilder';
import { getUserBalance, getUserTotalBalance } from '../utils/unbelieva';
import { TextChannel } from 'discord.js';

export const serverProfileCommand: Command = {
  name: 'server_profile',
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    try {
      await interaction.deferReply();

      // Determine which user's profile to show
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;
      const username = targetUser.username;
      const avatarUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL() : '';

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
        const levelChannelId = '1311706732082237460';
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

      const embed = new SimpleEmbedBuilder()
        .setTitle(`${username}'s profile`)
        .setColor('#6BCB77')
        .setThumbnail(avatarUrl || '')
        .addField('Bio', bioText, false)
        .addField('💰 **Your Money**', serverMoneyText, false)
        .addField('🏅 **Your Level**', serverLevelText, false)
        .addField('🌸 **Pollinations**', pollinationCountText, false)
        .addField('🎮 **Total Games Played**', `${totalGames}`, false)
        .addField('🏅 **Achievements**', '[Your achievements will be shown here]', false);

      if (favoriteIdolName) {
        embed.addField('Favorite Idol', favoriteIdolName, false);
      }
      if (favoriteIdolImage) {
        embed.setImage(favoriteIdolImage);
      }

      embed.setFooter('Server stats');

      await interaction.editReply({ embeds: [embed.build()] });
    } catch (error) {
      console.error('❌ Error fetching server profile:', error);
      await interaction.editReply('❌ Failed to load server profile.');
    }
  }
};
