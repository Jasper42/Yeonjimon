import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';

export const rpsCommand: Command = {
  name: 'rps',
  execute: async (context: CommandContext) => {
    const { interaction } = context;

    const userChoice = interaction.options.getString('choice');
    if (!userChoice) {
      await interaction.reply({ content: 'Please choose rock, paper, or scissors.', flags: MessageFlags.Ephemeral });
      return;
    }

    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    let result: string;

    if (userChoice === botChoice) {
      result = "It's a tie!";
    } else if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = 'You win!';
    } else {
      result = 'You lose!';
    }

    await interaction.reply({ content: `You chose **${userChoice}**.\nI chose **${botChoice}**.\n${result}` });
  }
};
