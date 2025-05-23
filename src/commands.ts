import { SlashCommandBuilder } from 'discord.js';
import config from './config';

const SlotsCost = config.SlotsCost;

export const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription(`Start a guess-the-idol game`)
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription(`The idol name to guess`)
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('limit')
        .setDescription(`Wrong guess limit per user`)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('group')
        .setDescription(`The name of the idol group`)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription(`End the current game`),

  new SlashCommandBuilder()
    .setName('slots')
    .setDescription(`Entry cost: ${SlotsCost} coins`),

  new SlashCommandBuilder()
    .setName('chat')
    .setDescription(`Chat with Yeonjimon`)
    .addStringOption(opt =>
      opt.setName('prompt')
        .setDescription(`The question to ask Groq AI`)
        .setRequired(true)
    )
  
  // new SlashCommandBuilder()
  //   .setName('high or low')
  //   .setDescription(`Start a high-low game`)
];

