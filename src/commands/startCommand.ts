import { TextChannel } from 'discord.js';
import { Command, CommandContext } from './types';
import { gameSessions } from '../utils/botConstants';
import config from '../config';

export const startCommand: Command = {
  name: 'start',
  execute: async (context: CommandContext) => {
    const { interaction, channelId, session, userId } = context;

    const name: string = interaction.options.getString('name')!.toLowerCase();
    const limit: number = interaction.options.getInteger('limit') ?? 0;
    const groupName: string | undefined = interaction.options.getString('group')?.toLowerCase();
    const imageUrl: string | undefined = interaction.options.getString('image') ?? undefined;

    if (session?.active) {
      await interaction.reply({ content: '⚠️ A game is already active!', ephemeral: true });
      return;
    }

    if (!channelId) {
      await interaction.reply({ content: '❌ Channel ID is undefined.', ephemeral: true });
      return;
    }

    gameSessions[channelId] = {
      target: name,
      limit,
      groupname: groupName,
      active: true,
      players: {},
      starterId: userId,
      starterName: interaction.user.username,
      imageUrl // set from slash command option
    };

    await interaction.reply({ content: `✅ Game started with ${limit} tries.`, ephemeral: true });

    // Announce game in channel after replying to interaction
    (async () => {
      const gamePingRoleId: string = config.GamePingRoleId;
      const textChannel = interaction.channel as TextChannel;
      if (textChannel?.send) {
        let gameAnnouncement: string = `<@${userId}> started a 🎮 Guess-the-Idol 🎮 game! \nType \`!idolname\` to guess. You have **${limit}** tries.`;
        if (groupName) {
          gameAnnouncement += `\nA group name has been provided!`;
        }
        if (gamePingRoleId == '0') {
          await textChannel.send(gameAnnouncement);
        } else {
          await textChannel.send(`${gameAnnouncement} <@&${gamePingRoleId}>`);
        }
      }
    })();
  }
};
