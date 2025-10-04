import { Command, CommandContext } from './types';
import { awardCurrency, subtractCurrency } from '../utils/unbelieva';
import { checkAndUnlockAchievements, sendAchievementAnnouncements } from '../utils/achievementUtils';
import { getFreeSpins, decrementFreeSpins, addFreeSpins, getTicketBuffs, decrementTicketBuffs } from '../utils/pointsManager';
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

    // Check for ticket buffs and handle currency
    let hasSilverTicket = false;
    let hasGoldenTicket = false;
    
    if (!usingFreeSpin) {
      try {
        // Subtract entry cost upfront
        await subtractCurrency(userId, slotsCost);
        
        // Check for active ticket buffs (no API calls needed!)
        const buffs = await getTicketBuffs(userId);
        hasSilverTicket = buffs.silver > 0;
        hasGoldenTicket = buffs.golden > 0;
        
      } catch (error) {
        console.error('Failed to process slots entry:', error);
        await interaction.editReply({ 
          content: '❌ Unable to process slots game due to API rate limits. Please wait a moment and try again.' 
        });
        return;
      }
    } else {
      // Free spins don't use ticket buffs
      hasSilverTicket = false;
      hasGoldenTicket = false;
    }

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

    // Golden Ticket: Special jackpot gives free spins instead of coins (only when not using free spins)
    if (!usingFreeSpin && hasGoldenTicket && isJackpot) {
      await addFreeSpins(userId, 10);
      const entryCost = usingFreeSpin ? 'Free Spin' : `-${slotsCost} coins`;
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**🎊 GOLDEN JACKPOT! You won 10 Free Spins! 🎊**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      return;
    }

    // Calculate winnings with ticket modifiers
    if (isJackpot) {
      winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
      
      // Apply ticket multipliers (only when not using free spins)
      if (!usingFreeSpin && hasSilverTicket) winnings = Math.floor(winnings * 1.5); // +50%
      if (!usingFreeSpin && hasGoldenTicket) {
        winnings = Math.floor(winnings * 3); // +200%
        // Apply minimum only when Golden Ticket is consumed (not on free spins)
        if (config.GoldenTicketMinWinnings > 0) {
          winnings = Math.max(winnings, config.GoldenTicketMinWinnings);
        }
      }
      
      const entryCost = usingFreeSpin ? 'Free Spin' : `-${slotsCost} coins`;
      const netProfit = winnings; // Net profit is just winnings since entry cost is returned
      const announcement: string = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
      const ticketBonus = (!usingFreeSpin && (hasSilverTicket || hasGoldenTicket)) ? 
        ` ${hasSilverTicket ? '<:Silver_Ticket:1418994527989137418>' : ''}${hasGoldenTicket ? '<:Golden_Ticket:1418993856640319611>' : ''} TICKET BONUS!` : '';
      // Display feel-good amount: if winnings are 0, show entry cost amount for psychology
      const displayAmount = winnings > 0 ? winnings : (usingFreeSpin ? 0 : slotsCost);
      
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**${announcement}${ticketBonus} You won ${displayAmount} coins!**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      // Award just the winnings (entry cost already deducted upfront)
      if (winnings > 0) {
        try {
          await awardCurrency(userId, winnings);
        } catch (error) {
          console.error('Failed to award currency:', error);
          // Game already completed, don't show error to user
        }
      }
      
    } else if (isThreeUnique) {
      winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
      
      // Apply ticket multipliers (only when not using free spins)
      if (!usingFreeSpin && hasSilverTicket) winnings = Math.floor(winnings * 1.5); // +50%
      if (!usingFreeSpin && hasGoldenTicket) {
        winnings = Math.floor(winnings * 3); // +200%
        // Apply minimum only when Golden Ticket is consumed (not on free spins)
        if (!usingFreeSpin && config.GoldenTicketMinWinnings > 0) {
          winnings = Math.max(winnings, config.GoldenTicketMinWinnings);
        }
      }
      
      const entryCost = usingFreeSpin ? 'Free Spin' : `-${slotsCost} coins`;
      const netProfit = winnings; // Net profit is just winnings since entry cost is returned
      const announcement: string = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
      const ticketBonus = (!usingFreeSpin && (hasSilverTicket || hasGoldenTicket)) ? 
        ` ${hasSilverTicket ? '<:Silver_Ticket:1418994527989137418>' : ''}${hasGoldenTicket ? '<:Golden_Ticket:1418993856640319611>' : ''} TICKET BONUS!` : '';
      // Display feel-good amount: if winnings are 0, show entry cost amount for psychology
      const displayAmount = winnings > 0 ? winnings : (usingFreeSpin ? 0 : slotsCost);
      
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**${announcement}${ticketBonus} You won ${displayAmount} coins!**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
      });
      // Award just the winnings (entry cost already deducted upfront)
      if (winnings > 0) {
        try {
          await awardCurrency(userId, winnings);
        } catch (error) {
          console.error('Failed to award currency:', error);
          // Game already completed, don't show error to user
        }
      }
      
    } else {
      // Losing spin
      if (!usingFreeSpin) {
        // Silver ticket doubles losses - subtract additional penalty since base cost already taken
        if (hasSilverTicket) {
          const additionalPenalty = slotsCost; // Double the loss = base cost + additional penalty
          await subtractCurrency(userId, additionalPenalty);
          await interaction.editReply({ 
            content: `**Slot Machine Result:**\n${result}\n**Better luck next time! <:Silver_Ticket:1418994527989137418> Silver Ticket penalty: -${additionalPenalty} coins.**` 
          });
        } else {
          await interaction.editReply({ 
            content: `**Slot Machine Result:**\n${result}\n**Better luck next time!**` 
          });
        }
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

    // Decrement ticket buffs after use (only for paid spins, not free spins)
    if (!usingFreeSpin && (hasSilverTicket || hasGoldenTicket)) {
      try {
        await decrementTicketBuffs(userId);
      } catch (error) {
        console.error('Failed to decrement ticket buffs:', error);
        // Don't show error to user since game already completed successfully
      }
    }
  }
};

// Helper function to check if combination is winning
function isWinningCombination(slots: string[]): boolean {
  return slots[0] === slots[1] && slots[0] === slots[2] || new Set(slots).size === 3;
}
