import config from '../config';
import { GameSession } from './gameUtils';

export const isDev = config.isDev;
export const gameSessions: Record<string, GameSession> = {};
export const groqCooldowns: Record<string, boolean> = {};
export const groqQueue: Record<string, string[]> = {};
export const adminUserIds = ['1213277076472201256', '1261847335009517693', '1280582630513053810'];
export const numberEmoji: Record<number, string> = {
  0: '0️⃣', 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣',
  5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
};

