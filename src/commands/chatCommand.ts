import { Command, CommandContext } from './types';
import { queryYeonjiChat } from '../utils/aiUtils';

export const chatCommand: Command = {
  name: 'chat',
  execute: async (context: CommandContext) => {
    const { interaction } = context;

    const prompt = interaction.options.getString('message');
    if (!prompt) {
      await interaction.reply({ content: 'You didn\'t say anything.'});
      return;
    }

    try {
      const aiReply = await queryYeonjiChat(prompt);
      await interaction.reply(aiReply);
    } catch (err) {
      console.error('❌ Failed to get AI response:', err);
      await interaction.reply({ content: '❌ Failed to get a response from AI.', ephemeral: true });
    }
  }
};
