import { Command, CommandContext } from './types';
import { removePlayer } from '../utils/pointsManager';
import { adminUserIds } from '../utils/botConstants';
import { extractUserId } from './utils';

export const adminRemovePlayerCommand: Command = {
  name: 'x_admin_removeplayer',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const targetUserId = interaction.options.getString('user');
    const targetUserIdtrimmed = extractUserId(targetUserId);
    
    if (!targetUserIdtrimmed) {
      await interaction.reply({ content: 'Please provide a user ID to remove.', ephemeral: true });
      return;
    }

    await removePlayer(targetUserIdtrimmed);
    await interaction.reply({ content: `Removed ${targetUserIdtrimmed}.` });
  }
};
