import { Command, CommandContext } from './types';
import { getUserInventory, removeInventoryItem } from '../utils/unbelieva';
import { addTicketBuffs } from '../utils/pointsManager';

export const consumeTicketsCommand: Command = {
  name: 'consume-tickets',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    
    // Defer the interaction since we'll be making API calls
    await interaction.deferReply();
    
    const silverAmount = interaction.options.getInteger('silver') || 0;
    const goldenAmount = interaction.options.getInteger('golden') || 0;
    const consumeAll = !silverAmount && !goldenAmount;
    
    try {
      // Get user's inventory
      const inventory = await getUserInventory(userId);
      
      // Find ticket items using regex patterns
      const silverTickets = inventory.filter((item: any) => 
        /silver.*ticket/i.test(item.name)
      );
      const goldenTickets = inventory.filter((item: any) => 
        /golden.*ticket/i.test(item.name)
      );
      
      const availableSilver = silverTickets.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const availableGolden = goldenTickets.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      if (availableSilver === 0 && availableGolden === 0) {
        await interaction.editReply({
          content: '❌ You don\'t have any tickets to consume!'
        });
        return;
      }
      
      let silverToConsume = 0;
      let goldenToConsume = 0;
      
      if (consumeAll) {
        // Consume all available tickets
        silverToConsume = availableSilver;
        goldenToConsume = availableGolden;
      } else {
        // Consume specified amounts
        silverToConsume = Math.min(silverAmount, availableSilver);
        goldenToConsume = Math.min(goldenAmount, availableGolden);
        
        if (silverAmount > availableSilver || goldenAmount > availableGolden) {
          await interaction.editReply({
            content: `❌ Not enough tickets! You have ${availableSilver} Silver and ${availableGolden} Golden tickets.`
          });
          return;
        }
      }
      
      if (silverToConsume === 0 && goldenToConsume === 0) {
        await interaction.editReply({
          content: '❌ No tickets to consume with the specified amounts!'
        });
        return;
      }
      
      // Remove tickets from inventory
      if (silverToConsume > 0) {
        await removeInventoryItem(userId, "Silver Ticket", silverToConsume);
      }
      if (goldenToConsume > 0) {
        await removeInventoryItem(userId, "Golden Ticket", goldenToConsume);
      }
      
      // Add ticket buffs
      await addTicketBuffs(userId, silverToConsume, goldenToConsume);
      
      // Build response message
      let message = '✅ **Tickets consumed successfully!**\n\n';
      
      if (silverToConsume > 0) {
        message += `<:Silver_Ticket:1418994527989137418> **Silver Ticket Buff:** ${silverToConsume} rounds\n`;
        message += `• +50% slot winnings\n`;
        message += `• 30% chance of reroll on a loss\n`;
        message += `• ⚠️ Double losses on losing spins\n\n`;
      }
      
      if (goldenToConsume > 0) {
        message += `<:Golden_Ticket:1418993856640319611> **Golden Ticket Buff:** ${goldenToConsume} rounds\n`;
        message += `• +200% slot winnings\n`;
        message += `• Minimum 30 coin wins\n`;
        message += `• Special jackpot = 10 free spins\n\n`;
      }
      
      // Show buff summary
      if (silverToConsume > 0 && goldenToConsume > 0) {
        message += `🎫 **Buff Summary:**\n`;
        message += `• Silver buff: ${silverToConsume} rounds\n`;
        message += `• Golden buff: ${goldenToConsume} rounds\n`;
        message += `(Both buffs stack when active at the same time)\n\n`;
      }
      
      message += `\nBuffs will be consumed automatically when playing slots!`;
      
      await interaction.editReply({ content: message });
      
    } catch (error) {
      console.error('Failed to consume tickets:', error);
      await interaction.editReply({
        content: '❌ Failed to consume tickets. Please try again later.'
      });
    }
  }
};