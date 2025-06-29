import { Command } from './types';
import { slotsCommand } from './slotsCommand';
import { startCommand } from './startCommand';
import { endCommand } from './endCommand';
import { chatCommand } from './chatCommand';
import { leaderboardCommand } from './leaderboardCommand';
import { adminAddPointsCommand } from './adminAddPointsCommand';
import { adminSubtractPointsCommand } from './adminSubtractPointsCommand';
import { adminRemovePlayerCommand } from './adminRemovePlayerCommand';
import { rpsCommand } from './rpsCommand';
import { rpsGameCommand } from './rpsGameCommand';

export const commands: Map<string, Command> = new Map();

export function registerCommands() {
  commands.set(slotsCommand.name, slotsCommand);
  commands.set(startCommand.name, startCommand);
  commands.set(endCommand.name, endCommand);
  commands.set(chatCommand.name, chatCommand);
  commands.set(leaderboardCommand.name, leaderboardCommand);
  commands.set(adminAddPointsCommand.name, adminAddPointsCommand);
  commands.set(adminSubtractPointsCommand.name, adminSubtractPointsCommand);
  commands.set(adminRemovePlayerCommand.name, adminRemovePlayerCommand);
  commands.set(rpsCommand.name, rpsCommand);
  commands.set(rpsGameCommand.name, rpsGameCommand);
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}
