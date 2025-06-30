import { Client, GatewayIntentBits } from 'discord.js';
import config from './config';
import { initDatabase } from './utils/pointsManager';
import { setupEventHandlers } from './eventHandlers/setupHandlers';
import { cleanupInactiveChannels } from './utils/aiHintUtils';
import { gameSessions } from './utils/botConstants';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

initDatabase();

// Periodic cleanup to prevent memory leaks (every 30 minutes)
setInterval(() => {
  const activeChannelIds = new Set(
    Object.keys(gameSessions).filter(channelId => gameSessions[channelId]?.active)
  );
  cleanupInactiveChannels(activeChannelIds);
  console.log('🧹 Performed periodic cleanup of inactive channels');
}, 30 * 60 * 1000); // 30 minutes

try {
  client.login(config.TOKEN);
} catch (err) {
  console.error('Error starting bot:', err);
}

setupEventHandlers(client);