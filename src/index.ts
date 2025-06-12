import { Client, GatewayIntentBits } from 'discord.js';
import config from './config';
import { setupEventHandlers } from './eventHandlers';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

try {
  client.login(config.TOKEN);
} catch (err) {
  console.error('Error starting bot:', err);
}

setupEventHandlers(client);