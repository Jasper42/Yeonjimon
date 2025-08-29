import { TextChannel, MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { gameSessions } from '../utils/botConstants';

export const endCommand: Command = {
  name: 'end',
  execute: async (context: CommandContext) => {
    const { interaction, session } = context;

    if (!session?.active) {
      await interaction.reply({ content: 'No game to end.', flags: MessageFlags.Ephemeral });
      return;
    }
    
    session.active = false;
    
    await interaction.reply(`🛑 **Game ended manually!** The answer was **${session.target}** - No rewards given.`);
    
    try {
      if (session.imageUrl) {
        await (interaction.channel as TextChannel).send({ content: 'Here is the idol image!', files: [session.imageUrl] });
      } else {
        await (interaction.channel as TextChannel).send('No image was provided for this round.');
      }
      
      // Clean up game session to prevent memory leak
      const channelId = interaction.channel?.id;
      if (channelId) {
        delete gameSessions[channelId];
      }
    } catch (announcementError) {
      console.error('Error announcing game end in channel:', announcementError);
    }
  }
};
