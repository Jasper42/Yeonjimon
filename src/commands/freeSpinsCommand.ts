import { Command, CommandContext } from './types';
import { getFreeSpins } from '../utils/pointsManager';
import { MessageFlags } from 'discord.js';

export const freeSpinsCommand: Command = {
  name: 'freespins',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    try {
      const freeSpins = await getFreeSpins(userId);
      
      if (freeSpins > 0) {
        await interaction.reply({
          content: `🎰 You have **${freeSpins}** free spins remaining!\nUse \`/slots\` to use them.`,
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: `🎰 You have no free spins remaining.\nWin a Golden Ticket jackpot to get more!`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error('❌ Error checking free spins:', error);
      await interaction.reply({
        content: '❌ Failed to check free spins.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};