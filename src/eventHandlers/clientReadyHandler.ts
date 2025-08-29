import { Client, Events, TextChannel } from 'discord.js';
import { registerCommands } from '../registerCommands';
import config from '../config';
import { isDev } from '../utils/botConstants';
import { initializePollinationScheduler } from '../utils/pollinationScheduler';

export function setupClientReadyHandler(client: Client) {
  client.once(Events.ClientReady, async () => {
    if (!client.user) {
      console.error('❌ client.user is undefined!');
      return;
    }

    console.log(`🤖 Logged in as ${client.user.tag}`);
    await registerCommands(client.user.id);

    // Initialize pollination scheduler
    const scheduler = initializePollinationScheduler(client);
    await scheduler.initialize();

    if (isDev) { 
      const devChannel = client.channels.cache.get(config.DEV_CHANNEL_ID ?? '0') as TextChannel;
      if (devChannel) await devChannel.send('Yeonjimon is online!');
    }
  });
}