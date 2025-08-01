import config from '../config';
import { GameSession } from './gameUtils';

export const isDev = config.isDev;
export const gameSessions: Record<string, GameSession> = {};
export const groqCooldowns: Record<string, boolean> = {};
export const groqQueue: Record<string, string[]> = {};
export const adminUserIds = config.ADMIN_USER_IDS;
export const numberEmoji: Record<number, string> = {
  0: '0️⃣', 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣',
  5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
};

export const activeRpsGames: Map<string, { collector?: any; playCollector?: any }> = new Map();

