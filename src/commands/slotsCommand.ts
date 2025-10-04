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
    let remainingFreeSpins = freeSpins;
    
    if (freeSpins > 0) {
      usingFreeSpin = true;
      await decrementFreeSpins(userId);
      remainingFreeSpins = freeSpins - 1;
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
    }
    // Note: Free spins don't use ticket buffs - hasSilverTicket and hasGoldenTicket remain false

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
    const isStar = (slot: string): boolean => slot === ':star:';
    const hasThreeLemons: boolean = slots.every(isLemon);
    const hasThreeStars: boolean = slots.every(isStar);
    const isJackpot = slots[0] === slots[1] && slots[0] === slots[2];
    const isThreeUnique = new Set(slots).size === 3;
    const isTwoUnique = new Set(slots).size === 2;

    // Calculate base winnings first
    if (isJackpot) {
      winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
    } else if (isThreeUnique) {
      winnings = ThreeUniqueSlots;
    } else {
      winnings = 0; // Loss
    }

    // Apply ticket multipliers when not using free spins
    let finalWinnings = winnings;
    let ticketBonusText = '';
    
    if (!usingFreeSpin) {
      // Apply Silver Ticket multiplier (+50%)
      if (hasSilverTicket && winnings > 0) {
        finalWinnings = Math.floor(finalWinnings * 1.5);
        ticketBonusText += ' <:Silver_Ticket:1418994527989137418>';
      }
      
      // Apply Golden Ticket multiplier (3x base, but can stack with silver)
      if (hasGoldenTicket && winnings > 0) {
        finalWinnings = Math.floor(finalWinnings * 3);
        ticketBonusText += ' <:Golden_Ticket:1418993856640319611>';
        
        // Ensure minimum winnings for Golden Ticket
        if (config.GoldenTicketMinWinnings > 0) {
          finalWinnings = Math.max(finalWinnings, config.GoldenTicketMinWinnings);
        }
      }
      
      // Special Golden Ticket behavior for three stars
      if (hasGoldenTicket && hasThreeStars) {
        await addFreeSpins(userId, 10);
        await interaction.editReply({ 
          content: `**Slot Machine Result:**\n${result}\n**⭐ GOLDEN STAR JACKPOT!${ticketBonusText} You won 10 Free Spins! ⭐**` 
        });
        
        // Consume ticket buffs for Golden Star Jackpot
        try {
          await decrementTicketBuffs(userId, hasSilverTicket, hasGoldenTicket);
        } catch (error) {
          console.error('Failed to decrement ticket buffs:', error);
        }
        return;
      }
      
      // Handle losses with Silver Ticket penalty
      if (winnings === 0 && hasSilverTicket) {
        const additionalPenalty = slotsCost; // Double the loss = base cost + additional penalty
        await subtractCurrency(userId, additionalPenalty);
        
        const penaltyText = hasGoldenTicket ? 
          `**Better luck next time!${ticketBonusText} Silver Ticket penalty: -${additionalPenalty} coins.**` :
          `**Better luck next time! <:Silver_Ticket:1418994527989137418> Silver Ticket penalty: -${additionalPenalty} coins.**`;
        
        await interaction.editReply({ 
          content: `**Slot Machine Result:**\n${result}\n${penaltyText}` 
        });
        
        // Decrement ticket buffs
        try {
          await decrementTicketBuffs(userId, hasSilverTicket, hasGoldenTicket);
        } catch (error) {
          console.error('Failed to decrement ticket buffs:', error);
        }
        return;
      }
    }

    // Display results
    if (finalWinnings > 0) {
      const announcement = hasThreeLemons ? 
        (hasGoldenTicket ? 'GOLDEN LEMON JACKPOT!!!' : 'Jackpot!!!') :
        isJackpot ? 
          (hasGoldenTicket ? 'GOLDEN JACKPOT!' : 'Congratulations!') :
          (hasGoldenTicket ? 'GOLDEN WIN!' : 'Good job!');
      
      const bonusText = ticketBonusText ? ` TICKET BONUS!` : '';
      
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**${announcement}${ticketBonusText}${bonusText} You won ${finalWinnings} coins!**\n${usingFreeSpin ? `Free spins remaining: ${remainingFreeSpins}` : ''}` 
      });
      
      // Award the final winnings
      try {
        await awardCurrency(userId, finalWinnings);
      } catch (error) {
        console.error('Failed to award currency:', error);
      }
      
      // Check for achievements
      const newAchievements = await checkAndUnlockAchievements(userId, interaction.user.username, interaction.client);
      if (newAchievements.length > 0) {
        await sendAchievementAnnouncements(interaction.client, newAchievements, userId, interaction.user.username);
      }
    } else if (!usingFreeSpin) {
      // Regular loss (no silver ticket penalty since it was handled above)
      if (!hasSilverTicket) {
        await interaction.editReply({ 
          content: `**Slot Machine Result:**\n${result}\n**Better luck next time!**` 
        });
      }
    } else {
      // Free spin loss
      await interaction.editReply({ 
        content: `**Slot Machine Result:**\n${result}\n**Better luck next time! Free spin used.**\nFree spins remaining: ${remainingFreeSpins}` 
      });
    }

    // Decrement ticket buffs after use (only for paid spins, not free spins)
    if (!usingFreeSpin && (hasSilverTicket || hasGoldenTicket)) {
      try {
        await decrementTicketBuffs(userId, hasSilverTicket, hasGoldenTicket);
      } catch (error) {
        console.error('Failed to decrement ticket buffs:', error);
      }
    }
  }
};

// Helper function to check if combination is winning
function isWinningCombination(slots: string[]): boolean {
  return slots[0] === slots[1] && slots[0] === slots[2] || new Set(slots).size === 3;
}