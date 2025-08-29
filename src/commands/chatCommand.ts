import { Command, CommandContext } from './types';
import { queryYeonjiChat } from '../utils/aiUtils';
import { MessageFlags } from 'discord.js';

export const chatCommand: Command = {
  name: 'chat',
  execute: async (context: CommandContext) => {
    const { interaction } = context;

    const prompt = interaction.options.getString('message');
    if (!prompt) {
      await interaction.reply({ content: 'You didn\'t say anything.'});
      return;
    }

    // Reply immediately with a loading message since AI calls can be slow
    await interaction.reply({ content: '🤖 Thinking...', flags: MessageFlags.Ephemeral });

    try {
      const aiReply = await queryYeonjiChat(prompt);
      await interaction.followUp(aiReply);
    } catch (err) {
      console.error('❌ Failed to get AI response:', err);
      await interaction.followUp('❌ Failed to get a response from AI.');
    }
  }
};
