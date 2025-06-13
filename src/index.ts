import { Client, GatewayIntentBits } from 'discord.js';
import config from './config';
import { initDatabase } from './utils/pointsManager';
import { setupEventHandlers } from './eventHandlers/setupHandlers';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

initDatabase();

try {
  client.login(config.TOKEN);
} catch (err) {
  console.error('Error starting bot:', err);
}

setupEventHandlers(client);