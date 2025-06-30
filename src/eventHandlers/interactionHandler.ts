import { Client, Events, Interaction, InteractionReplyOptions, MessageFlags } from 'discord.js';
import { gameSessions } from '../utils/botConstants';
import { registerCommands, getCommand } from '../commands/registry';

export function setupInteractionHandler(client: Client) {
  // Register all commands
  registerCommands();
  
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      const channelId: string | undefined = interaction.channel?.id;
      const session = channelId ? gameSessions[channelId] : undefined;
      const userId: string = interaction.user.id;

      // Use modular command system
      const command = getCommand(interaction.commandName);
      if (command) {
        await command.execute({
          interaction,
          client,
          channelId,
          session,
          userId
        });
        return;
      }

      // Command not found
      await interaction.reply({ 
        content: `❌ Unknown command: ${interaction.commandName}`, 
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      console.error('❌ Unhandled error in interaction handler:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ 
            content: '❌ An error occurred while processing your command.', 
            flags: MessageFlags.Ephemeral 
          });
        } catch {}
      }
    }
  });
}