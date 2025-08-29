import { Command, CommandContext } from './types';
import { MessageFlags } from 'discord.js';
import { adminUserIds, isDev } from '../utils/botConstants';
import { pollinationScheduler } from '../utils/pollinationScheduler';

export const triggerPollinationScanCommand: Command = {
  name: 'trigger_pollination_scan',
  execute: async (context: CommandContext) => {
    const { interaction } = context;

    // Check if user is an admin
    if (!adminUserIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!pollinationScheduler) {
      if (isDev) {
        await interaction.reply({ 
          content: '⚠️ Pollination scheduler not available in testing environment.\nThis is normal - the scheduler is disabled when the designated channel doesn\'t exist.',
          flags: MessageFlags.Ephemeral 
        });
      } else {
        await interaction.reply({ 
          content: '❌ Pollination scheduler not initialized. Check logs for errors.', 
          flags: MessageFlags.Ephemeral 
        });
      }
      return;
    }

    await interaction.reply({ content: '🔍 Triggering manual pollination scan...', flags: MessageFlags.Ephemeral });

    try {
      await pollinationScheduler.triggerManualScan();
      await interaction.followUp({ content: '✅ Manual pollination scan triggered successfully!', flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('Error triggering manual scan:', error);
      await interaction.followUp({ content: '❌ Failed to trigger manual scan.', flags: MessageFlags.Ephemeral });
    }
  }
};
