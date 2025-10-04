import { Command, CommandContext } from './types';
import { getFreeSpins, getTicketBuffs } from '../utils/pointsManager';

export const buffsCommand: Command = {
  name: 'buffs',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    try {
      const freeSpins = await getFreeSpins(userId);
      const ticketBuffs = await getTicketBuffs(userId);
      
      let message = '🎮 **Your Active Buffs:**\n\n';
      let hasAnyBuffs = false;
      
      // Free spins buff
      if (freeSpins > 0) {
        hasAnyBuffs = true;
        message += `🎰 **Free Spins:** ${freeSpins} remaining\n`;
        message += `• No entry cost\n`;
        message += `• ⚠️ Ticket buffs are NOT active during free spins\n\n`;
      }
      
      // Silver ticket buff
      if (ticketBuffs.silver > 0) {
        hasAnyBuffs = true;
        message += `<:Silver_Ticket:1418994527989137418> **Silver Ticket Buff:** ${ticketBuffs.silver} rounds\n`;
        message += `• +50% slot winnings\n`;
        message += `• 30% chance of reroll on a loss\n`;
        message += `• ⚠️ Double losses on losing spins\n\n`;
      }
      
      // Golden ticket buff
      if (ticketBuffs.golden > 0) {
        hasAnyBuffs = true;
        message += `<:Golden_Ticket:1418993856640319611> **Golden Ticket Buff:** ${ticketBuffs.golden} rounds\n`;
        message += `• +200% slot winnings\n`;
        message += `• Minimum 30 coin wins\n`;
        message += `• Special jackpot = 10 free spins\n\n`;
      }
      
      if (!hasAnyBuffs) {
        message = '❌ **No Active Buffs**\n\n';
        message += '💡 **How to get buffs:**\n';
        message += '• Free spins: Win a Golden Ticket jackpot\n';
        message += '• Ticket buffs: Use `/consume-tickets` command after purchasing them\n';
      } else {
        message += '💡 Use `/slots` to play and consume these buffs automatically!';
        
        if (ticketBuffs.silver > 0 && ticketBuffs.golden > 0) {
          message += '\n✨ Both ticket buffs stack when active at the same time!';
        }
      }
      
      await interaction.reply({
        content: message
      });
      
    } catch (error) {
      console.error('❌ Error checking buffs:', error);
      await interaction.reply({
        content: '❌ Failed to check buffs.'
      });
    }
  }
};