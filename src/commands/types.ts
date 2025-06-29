import { ChatInputCommandInteraction, Client } from 'discord.js';
import { GameSession } from '../utils/gameUtils';

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: Client;
  channelId?: string;
  session?: GameSession;
  userId: string;
}

export interface Command {
  name: string;
  execute: (context: CommandContext) => Promise<void>;
}
