import { Command, CommandContext } from './types';
import { db } from '../utils/pointsManager';

export const setBioCommand: Command = {
  name: 'set_bio',
  options: [
    {
      name: 'bio',
      type: 'STRING',
      description: 'Your bio',
      required: false,
    },
    {
      name: 'idol_name',
      type: 'STRING',
      description: 'Favorite idol name',
      required: false,
    },
    {
      name: 'idol_image_url',
      type: 'STRING',
      description: 'Favorite idol image URL',
      required: false,
    },
  ],
  execute: async (context: CommandContext) => {
    const { interaction } = context;
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const bio = interaction.options.getString('bio') || null;
    const idolName = interaction.options.getString('idol_name') || null;
    const idolImageUrl = interaction.options.getString('idol_image_url') || null;

    try {
      // Ensure user profile exists
      db.run(
        `INSERT OR IGNORE INTO user_profiles (userId, username) VALUES (?, ?)`,
        [userId, username],
        (err: Error | null) => {
          if (err) {
            console.error('Error creating user profile:', err);
          }
          db.run(
            `UPDATE user_profiles SET bio = ?, favorite_idol_name = ?, favorite_idol_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?`,
            [bio, idolName, idolImageUrl, userId],
            (err2: Error | null) => {
              if (err2) {
                console.error('Error updating profile:', err2);
                interaction.reply('❌ Failed to update your profile.');
              } else {
                interaction.reply('✅ Your profile has been updated!');
              }
            }
          );
        }
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      await interaction.reply('❌ Failed to update your profile.');
    }
  }
};
