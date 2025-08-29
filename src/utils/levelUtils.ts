import { TextChannel, Client } from 'discord.js';
import config from '../config';

/**
 * Gets a user's current level by searching the level channel for advancement messages
 * @param client Discord client
 * @param userId User ID to search for
 * @returns The user's highest level found, or 0 if no level found
 */
export async function getUserLevel(client: Client, userId: string): Promise<number> {
  try {
    const levelChannelId = config.LEVEL_CHANNEL_ID;
    if (!levelChannelId) {
      return 0; // No level channel configured
    }

    // Get the guild using the configured guild ID
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
      return 0;
    }

    const levelChannel = guild.channels.cache.get(levelChannelId) as TextChannel | undefined;
    if (!levelChannel) {
      return 0; // Level channel not found
    }

    // Search through recent messages for level advancement notifications
    const messages = await levelChannel.messages.fetch({ limit: 100 }); // Increased limit for better coverage
    const userMentionRegex = new RegExp(`<@!?${userId}> has advanced to level (\\d+)`);
    let highestLevel = 0;

    messages.forEach(msg => {
      const match = msg.content.match(userMentionRegex);
      if (match) {
        const level = parseInt(match[1], 10);
        if (level > highestLevel) {
          highestLevel = level;
        }
      }
    });

    return highestLevel;
  } catch (error) {
    console.error('Error fetching user level:', error);
    return 0;
  }
}

/**
 * Gets a user's level with guild context (for use in commands with guild access)
 * @param guildChannelCache The guild's channel cache
 * @param userId User ID to search for
 * @returns The user's highest level found, or 0 if no level found
 */
export async function getUserLevelFromGuild(guildChannelCache: any, userId: string): Promise<number> {
  try {
    const levelChannelId = config.LEVEL_CHANNEL_ID;
    if (!levelChannelId) {
      return 0;
    }

    const levelChannel = guildChannelCache.get(levelChannelId) as TextChannel | undefined;
    if (!levelChannel) {
      return 0;
    }

    const messages = await levelChannel.messages.fetch({ limit: 100 });
    const userMentionRegex = new RegExp(`<@!?${userId}> has advanced to level (\\d+)`);
    let highestLevel = 0;

    messages.forEach(msg => {
      const match = msg.content.match(userMentionRegex);
      if (match) {
        const level = parseInt(match[1], 10);
        if (level > highestLevel) {
          highestLevel = level;
        }
      }
    });

    return highestLevel;
  } catch (error) {
    console.error('Error fetching user level from guild:', error);
    return 0;
  }
}
