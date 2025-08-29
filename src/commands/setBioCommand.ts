import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { db } from '../utils/pointsManager';

export const setBioCommand: Command = {
  name: 'set_bio',
  options: [
    {
      name: 'bio',
      type: 'STRING',
      description: 'Set your bio',
      required: false,
    },
    {
      name: 'idol_name',
      type: 'STRING',
      description: 'Set your favorite idol (name)',
      required: false,
    },
    {
      name: 'idol_image_url',
      type: 'STRING',
      description: 'Set your favorite idol image (URL)',
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
          // Build dynamic update query
          const fields = [];
          const values = [];
          if (bio !== null) {
            fields.push('bio = ?');
            values.push(bio);
          }
          if (idolName !== null) {
            fields.push('favorite_idol_name = ?');
            values.push(idolName);
          }
          if (idolImageUrl !== null) {
            fields.push('favorite_idol_image_url = ?');
            values.push(idolImageUrl);
          }
          if (fields.length === 0) {
            interaction.reply({ content: 'Please provide at least one field to update.', flags: MessageFlags.Ephemeral });
            return;
          }
          fields.push('updated_at = CURRENT_TIMESTAMP');
          values.push(userId);
          db.run(
            `UPDATE user_profiles SET ${fields.join(', ')} WHERE userId = ?`,
            values,
            (err2: Error | null) => {
              if (err2) {
                console.error('Error updating profile:', err2);
                interaction.reply({ content: '❌ Failed to update your profile.', flags: MessageFlags.Ephemeral });
              } else {
                interaction.reply({ content: '✅ Your profile has been updated!', flags: MessageFlags.Ephemeral });
              }
            }
          );
        }
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      await interaction.reply({ content: '❌ Failed to update your profile.', flags: MessageFlags.Ephemeral });
    }
  }
};
