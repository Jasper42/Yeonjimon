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
    )
    .addStringOption(opt =>
      opt.setName('image')
        .setDescription(`Image URL to reveal when guessed`)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription(`End the current game`),

  new SlashCommandBuilder()
    .setName('guesser_profile')
    .setDescription('View your Idol Guesser profile'),

  new SlashCommandBuilder()
    .setName('slots')
    .setDescription(`Entry cost: ${SlotsCost} coins`),

  new SlashCommandBuilder()
    .setName('chat')
    .setDescription(`Chat with Yeonjimon`)
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription(`Say something to Yeonji!`)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription(`View the guessing game leaderboard`)
    .addBooleanOption(opt =>
      opt.setName('showids')
      .setDescription(`Show user IDs`)
      .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('x_admin_addpoints')
    .setDescription(`Add points to a user`)
    .addStringOption(opt =>
      opt.setName('player')
      .setDescription(`The player to add points to`)
      .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('points')
      .setDescription(`The number of points to add`)
      .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('x_admin_subtractpoints')
    .setDescription(`Subtract points from a user`)
    .addStringOption(opt =>
      opt.setName('player')
      .setDescription(`The player to subtract points from`)
      .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('points')
      .setDescription(`The number of points to subtract`)
      .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('x_admin_removeplayer')
    .setDescription(`Remove a player`)
    .addStringOption(opt =>
      opt.setName('user')
        .setDescription(`The players User ID to remove them`)
        .setRequired(true)
        .setAutocomplete(false)
    ),

  new SlashCommandBuilder()
    .setName('rps_game')
    .setDescription(`Play Rock-Paper-Scissors with someone (or Yeonjimon)`)
    .addUserOption(opt =>
      opt.setName('opponent')
        .setDescription(`The user to play against`)
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('bet_amount')
        .setDescription(`Bet amount (optional)`)
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('rounds')
        .setDescription('Number of rounds (1, 3, or 5)')
        .setRequired(false)
        .addChoices(
          { name: '1', value: 1 },
          { name: '3', value: 3 },
          { name: '5', value: 5 }
        )
    ),
];

