import { Command, CommandContext } from './types';
import { awardCurrency, subtractCurrency } from '../utils/unbelieva';
import { checkAndUnlockAchievements } from '../utils/achievementUtils';
import config from '../config';

export const slotsCommand: Command = {
  name: 'slots',
  execute: async (context: CommandContext) => {
    const { interaction, userId } = context;
    const slotsCost: number = config.SlotsCost;

    const slotEmojis: string[] = [':butterfly:', ':four_leaf_clover:', ':cherries:', ':lemon:', ':star:'];
    const reel1: string[] = [...slotEmojis];
    const reel2: string[] = [...slotEmojis].reverse();
    const reel3: string[] = [slotEmojis[1], slotEmojis[4], slotEmojis[0], slotEmojis[2], slotEmojis[3]];

    const index1: number = Math.floor(Math.random() * reel1.length);
    const index2: number = Math.floor(Math.random() * reel2.length);
    const index3: number = Math.floor(Math.random() * reel3.length);

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

    if (slots[0] === slots[1] && slots[0] === slots[2]) {
      winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
      const announcement: string = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
      await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
      await awardCurrency(userId, winnings);
      
      // Check for new achievements
      const newAchievements = await checkAndUnlockAchievements(userId, interaction.user.username, interaction.client);
      if (newAchievements.length > 0) {
        const achievementMsg = `\n🏅 **New Achievements:**\n` + 
          newAchievements.map(a => `${a.emoji} **${a.name}** - *${a.description}*`).join('\n');
        await interaction.followUp({ content: achievementMsg });
      }
    } else if (new Set(slots).size === 3) {
      winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
      const announcement: string = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
      await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
      await awardCurrency(userId, winnings);
      
      // Check for new achievements
      const newAchievements = await checkAndUnlockAchievements(userId, interaction.user.username, interaction.client);
      if (newAchievements.length > 0) {
        const achievementMsg = `\n🏅 **New Achievements:**\n` + 
          newAchievements.map(a => `${a.emoji} **${a.name}** - *${a.description}*`).join('\n');
        await interaction.followUp({ content: achievementMsg });
      }
    } else {
      await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**Better luck next time! -${slotsCost} coins.**` });
      await subtractCurrency(userId, slotsCost);
    }
  }
};
