import { Command } from './types';
import { slotsCommand } from './slotsCommand';
import { startCommand } from './startCommand';
import { endCommand } from './endCommand';
import { chatCommand } from './chatCommand';
import { leaderboardCommand } from './leaderboardCommand';
import { guesserProfileCommand } from './guesserProfileCommand';
import { adminAddPointsCommand } from './adminAddPointsCommand';
import { adminSubtractPointsCommand } from './adminSubtractPointsCommand';
import { adminRemovePlayerCommand } from './adminRemovePlayerCommand';
import { rpsCommand } from './rpsCommand';
import { rpsGameCommand } from './rpsGameCommand';
import { serverProfileCommand } from './serverProfileCommand';
import { adminResetPollinationProgressCommand, adminResetPollinationProgressConfirmCommand } from './adminResetPollinationProgressCommand';
import { adminCountPollinationsCommand } from './adminCountPollinationsCommand';
import { checkPollinationCommand } from './adminPollinationInfoCommand';
import { adminTotalPollinationsCommand } from './adminTotalPollinationsCommand';
import { pollinationLeaderboardCommand } from './pollinationLeaderboardCommand';
import { setBioCommand } from './setBioCommand';
import { achievementsCommand } from './achievementsCommand';
import { triggerPollinationScanCommand } from './triggerPollinationScanCommand';

export const commands: Map<string, Command> = new Map();

export function registerCommands() {
  commands.set(slotsCommand.name, slotsCommand);
  commands.set(startCommand.name, startCommand);
  commands.set(endCommand.name, endCommand);
  commands.set(chatCommand.name, chatCommand);
  commands.set(leaderboardCommand.name, leaderboardCommand);
  commands.set(guesserProfileCommand.name, guesserProfileCommand);
  commands.set(adminAddPointsCommand.name, adminAddPointsCommand);
  commands.set(adminSubtractPointsCommand.name, adminSubtractPointsCommand);
  commands.set(adminRemovePlayerCommand.name, adminRemovePlayerCommand);
  commands.set(rpsCommand.name, rpsCommand);
  commands.set(rpsGameCommand.name, rpsGameCommand);
  commands.set(serverProfileCommand.name, serverProfileCommand);
  commands.set(adminResetPollinationProgressCommand.name, adminResetPollinationProgressCommand);
  commands.set(adminResetPollinationProgressConfirmCommand.name, adminResetPollinationProgressConfirmCommand);
  commands.set(adminCountPollinationsCommand.name, adminCountPollinationsCommand);
  commands.set(checkPollinationCommand.name, checkPollinationCommand);
  commands.set(adminTotalPollinationsCommand.name, adminTotalPollinationsCommand);
  commands.set(pollinationLeaderboardCommand.name, pollinationLeaderboardCommand);
  commands.set(setBioCommand.name, setBioCommand);
  commands.set(achievementsCommand.name, achievementsCommand);
  commands.set(triggerPollinationScanCommand.name, triggerPollinationScanCommand);
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}
