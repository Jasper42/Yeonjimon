import { REST, Routes } from 'discord.js';
import { commands } from './commands';
import config from './config';

export async function registerCommands(clientId: string) {
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, config.GUILD_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );

    console.log(`🔁 Synced ${(data as any[]).length} command(s) to guild ${config.GUILD_ID}`);
  } catch (error) {
    console.error('❌ Failed to sync commands:', error);
  }
}
