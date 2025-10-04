import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { addFreeSpins } from '../utils/pointsManager';
import { adminUserIds } from '../utils/botConstants';

export const adminGiftFreeSpinsCommand: Command = {
  name: 'x_admin_giftfreespins',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    // Check if user has admin permissions
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (!targetUser || !amount) {
      await interaction.reply({
        content: '❌ Please specify both a user and amount.',
        ephemeral: true
      });
      return;
    }

    if (amount <= 0) {
      await interaction.reply({
        content: '❌ Amount must be a positive number.',
        ephemeral: true
      });
      return;
    }

    try {
      await addFreeSpins(targetUser.id, amount);
      
      await interaction.reply({
        content: `✅ Successfully gifted **${amount}** free spins to <@${targetUser.id}>!`
      });
      
    } catch (error) {
      console.error('Failed to gift free spins:', error);
      await interaction.reply({
        content: '❌ Failed to gift free spins. Please try again.',
        ephemeral: true
      });
    }
  }
};