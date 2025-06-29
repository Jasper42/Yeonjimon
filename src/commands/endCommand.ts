import { TextChannel } from 'discord.js';
import { Command, CommandContext } from './types';

export const endCommand: Command = {
  name: 'end',
  execute: async (context: CommandContext) => {
    const { interaction, session } = context;

    if (!session?.active) {
      await interaction.reply({ content: 'No game to end.', ephemeral: true });
      return;
    }
    
    session.active = false;
    await interaction.reply('🛑 Game ended.');
    
    if (session.imageUrl) {
      await (interaction.channel as TextChannel).send({ content: 'Here is the idol image!', files: [session.imageUrl] });
    } else {
      await (interaction.channel as TextChannel).send('No image was provided for this round.');
    }
  }
};
