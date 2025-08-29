import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { subtractPoints } from '../utils/pointsManager';
import { adminUserIds } from '../utils/botConstants';
import { extractUserId } from './utils';

export const adminSubtractPointsCommand: Command = {
  name: 'x_admin_subtractpoints',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
      return;
    }

    const targetUserId = interaction.options.getString('player');
    const targetUserIdtrimmed = extractUserId(targetUserId);
    const pointsToSubtract = interaction.options.getInteger('points');
    
    if (!targetUserIdtrimmed || !pointsToSubtract) {
      await interaction.reply({ content: 'Please provide a user ID and points to subtract.', flags: MessageFlags.Ephemeral });
      return;
    }

    await subtractPoints(targetUserIdtrimmed, pointsToSubtract);
    await interaction.reply({ content: `Subtracted ${pointsToSubtract} points from ${targetUserIdtrimmed}.` });
  }
};
