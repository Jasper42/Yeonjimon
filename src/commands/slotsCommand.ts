import { Command, CommandContext } from './types';
import { awardCurrency, subtractCurrency, userHasItem, removeInventoryItem } from '../utils/unbelieva';
import { checkAndUnlockAchievements, sendAchievementAnnouncements } from '../utils/achievementUtils';
import { getFreeSpins, decrementFreeSpins, addFreeSpins } from '../utils/pointsManager';
import config from '../config';

export const slotsCommand: Command = {
  name: 'slots',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    
    // Defer the interaction since we'll be making multiple API calls
    await interaction.deferReply();
    
    const slotsCost: number = config.SlotsCost;

    // Check for free spins first
    const freeSpins = await getFreeSpins(userId);
    let usingFreeSpin = false;
    
    if (freeSpins > 0) {
      usingFreeSpin = true;
      await decrementFreeSpins(userId);
    }

    // Check for Silver and Golden Tickets in inventory
    const hasSilverTicket = await userHasItem(userId, "Silver Ticket");
    const hasGoldenTicket = await userHasItem(userId, "Golden Ticket");

    const slotEmojis: string[] = [':butterfly:', ':four_leaf_clover:', ':cherries:', ':lemon:', ':star:'];
    let reel1: string[] = [...slotEmojis];
    let reel2: string[] = [...slotEmojis].reverse();
    let reel3: string[] = [slotEmojis[1], slotEmojis[4], slotEmojis[0], slotEmojis[2], slotEmojis[3]];

    // Silver Ticket: Improve odds by adding more winning symbols
    if (hasSilverTicket) {
      // Add extra winning symbols to improve odds
      reel1.push(':star:', ':cherries:');
      reel2.push(':star:', ':cherries:');
      reel3.push(':star:', ':cherries:');
    }

    let index1: number = Math.floor(Math.random() * reel1.length);
    let index2: number = Math.floor(Math.random() * reel2.length);
    let index3: number = Math.floor(Math.random() * reel3.length);

    // Silver Ticket: Second chance for better results
    if (hasSilverTicket) {
      const firstResult = [reel1[index1], reel2[index2], reel3[index3]];
      if (!isWinningCombination(firstResult) && Math.random() < 0.3) {
        // 30% chance to reroll if first result was losing
        index1 = Math.floor(Math.random() * reel1.length);
        index2 = Math.floor(Math.random() * reel2.length);
        index3 = Math.floor(Math.random() * reel3.length);
      }
    }

    const result: string = `
${reel1[(index1 - 1 + reel1.length) % reel1.length]} | ${reel2[(index2 - 1 + reel2.length) % reel2.length]} | ${reel3[(index3 - 1 + reel3.length) % reel3.length]}
${reel1[index1]} | ${reel2[index2]} | ${reel3[index3]}
${reel1[(index1 + 1) % reel1.length]} | ${reel2[(index2 + 1) % reel2.length]} | ${reel3[(index3 + 1) % reel3.length]}
`;

    const slots: string[] = [reel1[index1], reel2[index2], reel3[index3]];
    let winnings: number = 0;

    const ThreeUniqueSlots: number = config.ThreeUnique;
    const threeMatchReward: number = config.ThreeMatchReward;
    const lemonMultiplier: number = config.LemonMultiplier;

    const isLemon = (slot: string): boolean => slot === ':lemon:';
    const hasThreeLemons: boolean = slots.every(isLemon);
    const isJackpot = slots[0] === slots[1] && slots[0] === slots[2];
    const isThreeUnique = new Set(slots).size === 3;

    // Golden Ticket: Special jackpot gives free spins instead of coins
    if (hasGoldenTicket && isJackpot) {
      await addFreeSpins(userId, 10);
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**🎊 GOLDEN JACKPOT! You won 10 Free Spins! 🎊**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      return;
    }

    // Calculate winnings with ticket modifiers
    if (isJackpot) {
      winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
      
      // Apply ticket multipliers
      if (hasSilverTicket) winnings = Math.floor(winnings * 1.5); // +50%
      if (hasGoldenTicket) winnings = Math.floor(winnings * 3); // +200%
      
      const announcement: string = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
      const ticketBonus = hasSilverTicket || hasGoldenTicket ? 
        ` ${hasSilverTicket ? '🎫' : ''}${hasGoldenTicket ? '🎟️' : ''} TICKET BONUS!` : '';
      
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**${announcement}${ticketBonus} You won ${winnings} coins!**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      await awardCurrency(userId, winnings);
      
    } else if (isThreeUnique) {
      winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
      
      // Apply ticket multipliers
      if (hasSilverTicket) winnings = Math.floor(winnings * 1.5); // +50%
      if (hasGoldenTicket) winnings = Math.floor(winnings * 3); // +200%
      
      const announcement: string = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
      const ticketBonus = hasSilverTicket || hasGoldenTicket ? 
        ` ${hasSilverTicket ? '🎫' : ''}${hasGoldenTicket ? '🎟️' : ''} TICKET BONUS!` : '';
      
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**${announcement}${ticketBonus} You won ${winnings} coins!**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      await awardCurrency(userId, winnings);
      
    } else {
      // Losing spin
      if (!usingFreeSpin) {
        const loss = hasSilverTicket ? slotsCost * 2 : slotsCost; // Silver ticket doubles losses
        const lossMessage = hasSilverTicket ? 
          `**Better luck next time! 🎫 Silver Ticket penalty: -${loss} coins.**` :
          `**Better luck next time! -${loss} coins.**`;
        
        await interaction.editReply({ 
          content: `**Slot Machine Result:**\n${result}\n${lossMessage}` 
        });
        await subtractCurrency(userId, loss);
      } else {
        await interaction.editReply({ 
          content: `**Slot Machine Result:**\n${result}\n**Better luck next time! Free spin used.**\nFree spins remaining: ${freeSpins - 1}` 
        });
      }
    }

    // Check for achievements if they won
    if (winnings > 0) {
      const newAchievements = await checkAndUnlockAchievements(userId, interaction.user.username, interaction.client);
      if (newAchievements.length > 0) {
        await sendAchievementAnnouncements(interaction.client, newAchievements, userId, interaction.user.username);
      }
    }

    // Consume tickets after use
    if (hasSilverTicket) {
      await removeInventoryItem(userId, "Silver Ticket", 1);
    }
    if (hasGoldenTicket) {
      await removeInventoryItem(userId, "Golden Ticket", 1);
    }
  }
};

// Helper function to check if combination is winning
function isWinningCombination(slots: string[]): boolean {
  return slots[0] === slots[1] && slots[0] === slots[2] || new Set(slots).size === 3;
}
