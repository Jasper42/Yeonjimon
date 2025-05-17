import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start a guess-the-idol game')
    .addStringOption(opt => opt.setName('name').setDescription('The idol name to guess').setRequired(true))
    .addIntegerOption(opt => opt.setName('limit').setDescription('Wrong guess limit per user').setRequired(true)),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription('End the current game')
];