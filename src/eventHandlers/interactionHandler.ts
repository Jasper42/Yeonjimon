import { Client, Events, Interaction, InteractionReplyOptions, MessageFlags } from 'discord.js';
import { gameSessions } from '../utils/botConstants';
import { registerCommands, getCommand } from '../commands/registry';

export function setupInteractionHandler(client: Client) {
  // Register all commands
  registerCommands();
  
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const startTime = Date.now();
    console.log(`🎯 [${new Date().toISOString()}] Received command: ${interaction.commandName} from ${interaction.user.username} in channel ${interaction.channel?.id}`);

    try {
      const channelId: string | undefined = interaction.channel?.id;
      const session = channelId ? gameSessions[channelId] : undefined;
      const userId: string = interaction.user.id;

      // Use modular command system
      const command = getCommand(interaction.commandName);
      if (command) {
        console.log(`⚡ [${new Date().toISOString()}] Executing command: ${interaction.commandName}`);
        await command.execute({
          interaction,
          client,
          channelId,
          session,
          userId
        });
        const endTime = Date.now();
        console.log(`✅ [${new Date().toISOString()}] Command ${interaction.commandName} completed in ${endTime - startTime}ms`);
        return;
      }

      // Command not found
      await interaction.reply({ 
        content: `❌ Unknown command: ${interaction.commandName}`, 
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      const endTime = Date.now();
      console.error(`❌ [${new Date().toISOString()}] Error in interaction handler after ${endTime - startTime}ms:`, err);
      console.error(`❌ Command: ${interaction.commandName}, User: ${interaction.user.username}, Channel: ${interaction.channel?.id}`);
      console.error(`❌ Interaction state - replied: ${interaction.replied}, deferred: ${interaction.deferred}`);
      
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ 
            content: '❌ An error occurred while processing your command.', 
            flags: MessageFlags.Ephemeral 
          });
        } catch (replyErr) {
          console.error(`❌ Failed to send error reply:`, replyErr);
        }
      }
    }
  });
}