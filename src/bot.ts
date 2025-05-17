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
} catch (error) {
  console.error('Error starting bot:', error);
}

setupEventHandlers(client);

client.login(config.TOKEN);