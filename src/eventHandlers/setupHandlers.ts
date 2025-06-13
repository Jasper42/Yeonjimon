import { Client } from 'discord.js';
import { setupClientReadyHandler } from './clientReadyHandler';
import { setupInteractionHandler } from './interactionHandler';
import { setupMessageHandler } from './messageHandler';

export function setupEventHandlers(client: Client) {
  setupClientReadyHandler(client);
  setupInteractionHandler(client);
  setupMessageHandler(client);
}