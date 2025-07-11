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
  options?: CommandOption[];
  execute: (context: CommandContext) => Promise<void>;
}

export interface CommandOption {
  name: string;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN';
  description: string;
  required?: boolean;
}
