import { TextChannel, MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { gameSessions } from '../utils/botConstants';
import { incrementGameStarted } from '../utils/pointsManager';
import config from '../config';

export const startCommand: Command = {
  name: 'start',
  execute: async (context: CommandContext) => {
    const { interaction, channelId, session, userId } = context;

    const name: string = interaction.options.getString('name')!.toLowerCase();
    const limit: number = interaction.options.getInteger('limit') ?? 0;
    const groupName: string | undefined = interaction.options.getString('group')?.toLowerCase();
    const imageUrl: string | undefined = interaction.options.getString('image') ?? undefined;
    const noHints: boolean = interaction.options.getBoolean('nohints') ?? false;

    if (session?.active) {
      await interaction.reply({ content: '⚠️ A game is already active!', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!channelId) {
      await interaction.reply({ content: '❌ Channel ID is undefined.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Create game session FIRST (fast, synchronous)
    gameSessions[channelId] = {
      target: name,
      limit,
      groupname: groupName,
      active: true,
      players: {},
      correctGuessers: new Set(),
      starterId: userId,
      starterName: interaction.user.username,
      imageUrl, // set from slash command option
      noHints // disable helpful hints option
    };

    // Reply immediately after session creation
    await interaction.reply({ content: `✅ Game started with ${limit} tries.`, flags: MessageFlags.Ephemeral });

    // Track that this user started a game (async, non-blocking)
    setImmediate(() => {
      incrementGameStarted(userId, interaction.user.username);
    });

    // Announce game in channel after replying to interaction
    try {
      const gamePingRoleId: string = config.GamePingRoleId;
      const textChannel = interaction.channel as TextChannel;
      if (textChannel?.send) {
        let gameAnnouncement: string = `<@${userId}> started a 🎮 Guess-the-Idol 🎮 game! \nType \`!idolname\` to guess. You have **${limit}** tries.`;
        if (groupName) {
          gameAnnouncement += `\nA group name has been provided!`;
        }
        if (noHints) {
          gameAnnouncement += `\n🤐 **No Hints Mode** enabled.`;
        }
        if (gamePingRoleId == '0') {
          await textChannel.send(gameAnnouncement);
        } else {
          await textChannel.send(`${gameAnnouncement} <@&${gamePingRoleId}>`);
        }
      }
    } catch (announcementError) {
      console.error('Error announcing game in channel:', announcementError);
    }
  }
};
