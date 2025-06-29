import { Command, CommandContext } from './types';
import { addPoints } from '../utils/pointsManager';
import { getUserFromId } from '../utils/gameUtils';
import { adminUserIds } from '../utils/botConstants';
import { extractUserId } from './utils';

export const adminAddPointsCommand: Command = {
  name: 'x_admin_addpoints',
  execute: async (context: CommandContext) => {
    const { interaction, client, userId } = context;

    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const targetUserId = interaction.options.getString('player');
    const targetUserIdtrimmed = extractUserId(targetUserId);
    const pointsToAdd = interaction.options.getInteger('points');
    
    if (!targetUserIdtrimmed || !pointsToAdd) {
      await interaction.reply({ content: 'Please provide a user ID and points to add.', ephemeral: true });
      return;
    }

    const user = await getUserFromId(client, targetUserIdtrimmed);
    if (!user) {
      await interaction.reply({ content: `User not found: ${targetUserIdtrimmed}`, ephemeral: true });
      return;
    }

    await addPoints(targetUserIdtrimmed, user.username, pointsToAdd);
    await interaction.reply({ content: `Added ${pointsToAdd} points to ${user.username} (${targetUserIdtrimmed}).` });
  }
};
