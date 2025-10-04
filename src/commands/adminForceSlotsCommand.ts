import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { awardCurrency, subtractCurrency } from '../utils/unbelieva';
import { checkAndUnlockAchievements, sendAchievementAnnouncements } from '../utils/achievementUtils';
import { getFreeSpins, decrementFreeSpins, getTicketBuffs, decrementTicketBuffs } from '../utils/pointsManager';
import { adminUserIds } from '../utils/botConstants';
import config from '../config';

export const adminForceSlotsCommand: Command = {
  name: 'x_admin_forceslots',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;

    // Check if user has admin permissions
    if (!adminUserIds.includes(userId)) {
      await interaction.reply({ 
        content: 'You do not have permission to use this command.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    // Defer the interaction since we'll be making multiple API calls
    await interaction.deferReply();

    const slot1 = interaction.options.getString('slot1');
    const slot2 = interaction.options.getString('slot2');
    const slot3 = interaction.options.getString('slot3');

    if (!slot1 || !slot2 || !slot3) {
      await interaction.editReply({
        content: '❌ Please specify all three slot results (butterfly, clover, cherries, lemon, star).'
      });
      return;
    }

    // Validate slot symbols
    const validSymbols = ['butterfly', 'clover', 'cherries', 'lemon', 'star'];
    const symbolMap: { [key: string]: string } = {
      'butterfly': ':butterfly:',
      'clover': ':four_leaf_clover:',
      'cherries': ':cherries:',
      'lemon': ':lemon:',
      'star': ':star:'
    };

    if (!validSymbols.includes(slot1) || !validSymbols.includes(slot2) || !validSymbols.includes(slot3)) {
      await interaction.editReply({
        content: `❌ Invalid slot symbols. Valid options: ${validSymbols.join(', ')}`
      });
      return;
    }

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
        
        // Check for active ticket buffs
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

    // Convert to emoji format
    const slots: string[] = [symbolMap[slot1], symbolMap[slot2], symbolMap[slot3]];
    
    // Create the result display (forced result)
    const result: string = `
🎰 | 🎰 | 🎰
${slots[0]} | ${slots[1]} | ${slots[2]}
🎰 | 🎰 | 🎰
`;

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

    // Calculate base winnings
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
        await interaction.editReply({ 
          content: `**🔧 ADMIN FORCED SLOT RESULT:**\n${result}\n**⭐ GOLDEN STAR JACKPOT!${ticketBonusText} You won 10 Free Spins! ⭐**` 
        });
        
        // Decrement ticket buffs
        try {
          await decrementTicketBuffs(userId, hasSilverTicket, hasGoldenTicket);
        } catch (error) {
          console.error('Failed to decrement ticket buffs:', error);
        }
        return;
      }
      
      // Handle losses with Silver Ticket penalty
      if (winnings === 0 && hasSilverTicket) {
        const additionalPenalty = slotsCost;
        await subtractCurrency(userId, additionalPenalty);
        
        const penaltyText = hasGoldenTicket ? 
          `**Better luck next time!${ticketBonusText} Silver Ticket penalty: -${additionalPenalty} coins.**` :
          `**Better luck next time! <:Silver_Ticket:1418994527989137418> Silver Ticket penalty: -${additionalPenalty} coins.**`;
        
        await interaction.editReply({ 
          content: `**🔧 ADMIN FORCED SLOT RESULT:**\n${result}\n${penaltyText}` 
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
        content: `**🔧 ADMIN FORCED SLOT RESULT:**\n${result}\n**${announcement}${ticketBonusText}${bonusText} You won ${finalWinnings} coins!**\n${usingFreeSpin ? `Free spins remaining: ${freeSpins - 1}` : ''}` 
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
          content: `**🔧 ADMIN FORCED SLOT RESULT:**\n${result}\n**Better luck next time!**` 
        });
      }
    } else {
      // Free spin loss
      await interaction.editReply({ 
        content: `**🔧 ADMIN FORCED SLOT RESULT:**\n${result}\n**Better luck next time! Free spin used.**\nFree spins remaining: ${freeSpins - 1}` 
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