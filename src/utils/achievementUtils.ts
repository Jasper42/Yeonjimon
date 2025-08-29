import { db } from './pointsManager';
import { getUserPollinationCount } from './pollinationUtils';
import { getUserLevel } from './levelUtils';
import config from '../config';
import { TextChannel } from 'discord.js';

export interface Achievement {
  id: string;
  category: 'pollination' | 'games' | 'levels' | 'points' | 'money';
  name: string;
  description: string;
  emoji: string;
  requirement: number;
  tier: number; // 1 = bronze, 2 = silver, 3 = gold, 4 = platinum, 5 = diamond
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress?: number;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Pollination achievements
  { id: 'poll_10', category: 'pollination', name: 'Pollinator', description: 'Post 10 pollinations', emoji: '🌸', requirement: 10, tier: 1 },
  { id: 'poll_25', category: 'pollination', name: 'Flower Power', description: 'Post 25 pollinations', emoji: '🌺', requirement: 25, tier: 2 },
  { id: 'poll_50', category: 'pollination', name: 'Bloom Master', description: 'Post 50 pollinations', emoji: '🌻', requirement: 50, tier: 3 },
  { id: 'poll_100', category: 'pollination', name: 'Garden Guardian', description: 'Post 100 pollinations', emoji: '🌹', requirement: 100, tier: 4 },
  { id: 'poll_250', category: 'pollination', name: 'Pollination Legend', description: 'Post 250 pollinations', emoji: '🏵️', requirement: 250, tier: 5 },

  // Game achievements
  { id: 'games_5', category: 'games', name: 'First Steps', description: 'Win 5 guess-the-idol games', emoji: '🎮', requirement: 5, tier: 1 },
  { id: 'games_15', category: 'games', name: 'Rising Star', description: 'Win 15 guess-the-idol games', emoji: '⭐', requirement: 15, tier: 2 },
  { id: 'games_30', category: 'games', name: 'Idol Expert', description: 'Win 30 guess-the-idol games', emoji: '🏆', requirement: 30, tier: 3 },
  { id: 'games_75', category: 'games', name: 'Champion', description: 'Win 75 guess-the-idol games', emoji: '👑', requirement: 75, tier: 4 },
  { id: 'games_150', category: 'games', name: 'Legendary Guesser', description: 'Win 150 guess-the-idol games', emoji: '💎', requirement: 150, tier: 5 },

  // Level achievements
  { id: 'level_10', category: 'levels', name: 'Rookie', description: 'Reach Level 10', emoji: '🥉', requirement: 10, tier: 1 },
  { id: 'level_25', category: 'levels', name: 'Experienced', description: 'Reach Level 25', emoji: '🥈', requirement: 25, tier: 2 },
  { id: 'level_50', category: 'levels', name: 'Veteran', description: 'Reach Level 50', emoji: '🥇', requirement: 50, tier: 3 },
  { id: 'level_75', category: 'levels', name: 'Elite', description: 'Reach Level 75', emoji: '🏅', requirement: 75, tier: 4 },
  { id: 'level_100', category: 'levels', name: 'Ascended', description: 'Reach Level 100', emoji: '🌟', requirement: 100, tier: 5 },

  // Points achievements
  { id: 'points_50', category: 'points', name: 'Point Collector', description: 'Earn 50 total points', emoji: '💯', requirement: 50, tier: 1 },
  { id: 'points_120', category: 'points', name: 'Point Accumulator', description: 'Earn 120 total points', emoji: '🔢', requirement: 120, tier: 2 },
  { id: 'points_200', category: 'points', name: 'Point Master', description: 'Earn 200 total points', emoji: '🎯', requirement: 200, tier: 3 },
  { id: 'points_350', category: 'points', name: 'Point Virtuoso', description: 'Earn 350 total points', emoji: '✨', requirement: 350, tier: 4 },
  { id: 'points_500', category: 'points', name: 'Point Legend', description: 'Earn 500 total points', emoji: '💫', requirement: 500, tier: 5 },

  // Money achievements
  { id: 'money_1000', category: 'money', name: 'Penny Pincher', description: 'Earn 1000 total coins', emoji: '🪙', requirement: 1000, tier: 1 },
  { id: 'money_5000', category: 'money', name: 'Coin Collector', description: 'Earn 5000 total coins', emoji: '💰', requirement: 5000, tier: 2 },
  { id: 'money_15000', category: 'money', name: 'Wealthy', description: 'Earn 15000 total coins', emoji: '💸', requirement: 15000, tier: 3 },
  { id: 'money_50000', category: 'money', name: 'Rich', description: 'Earn 50000 total coins', emoji: '🤑', requirement: 50000, tier: 4 },
  { id: 'money_100000', category: 'money', name: 'Millionaire', description: 'Earn 100000 total coins', emoji: '💎', requirement: 100000, tier: 5 },
];

// Initialize achievement database
export function initAchievementDatabase(): void {
  db.serialize(() => {
    // User achievements table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        userId TEXT NOT NULL,
        achievementId TEXT NOT NULL,
        unlockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, achievementId)
      )
    `);
  });
}

// Get user's unlocked achievements
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM user_achievements WHERE userId = ?',
      [userId],
      (err, rows: any[]) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

/**
 * Sends achievement announcements to the level channel
 * @param client Discord client
 * @param achievements Array of achievements to announce
 * @param userId User ID who unlocked the achievements
 * @param username Username who unlocked the achievements
 */
export async function sendAchievementAnnouncements(client: any, achievements: Achievement[], userId: string, username: string): Promise<void> {
  if (!client || achievements.length === 0) return;
  
  try {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;
    
    const levelChannel = guild.channels.cache.get(config.LEVEL_CHANNEL_ID) as TextChannel | undefined;
    if (!levelChannel) return;
    
    const achievementMsg = `🏅 **New Achievements for <@${userId}>:**\n` + 
      achievements.map(a => `${a.emoji} **${a.name}** - *${a.description}*`).join('\n');
    
    await levelChannel.send(achievementMsg);
  } catch (error) {
    console.error('Error sending achievement announcements:', error);
  }
}

// Check and unlock achievements for a user
export async function checkAndUnlockAchievements(userId: string, username: string, client?: any): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];
  
  try {
    // Get current user stats
    const { getUserProfile } = await import('./pointsManager');
    const { getUserTotalBalance } = await import('./unbelieva');
    const profile = await getUserProfile(userId);
    if (!profile) return [];

    const pollinationCount = await getUserPollinationCount(userId);
    const unbelievaBalance = await getUserTotalBalance(userId);
    const userLevel = client ? await getUserLevel(client, userId) : 0;
    
    // TODO: Get level from level channel or add level tracking
    // For now, we'll skip level achievements
    
    // Get currently unlocked achievements
    const unlockedAchievements = await getUserAchievements(userId);
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue; // Already unlocked

      let currentValue = 0;
      switch (achievement.category) {
        case 'pollination':
          currentValue = pollinationCount;
          break;
        case 'games':
          currentValue = profile.gamesWon;
          break;
        case 'points':
          currentValue = profile.totalPoints;
          break;
        case 'money':
          currentValue = unbelievaBalance ?? 0; // Use actual Unbelievaboat balance
          break;
        case 'levels':
          currentValue = userLevel;
          break;
      }

      // Check if requirement is met
      if (currentValue >= achievement.requirement) {
        await unlockAchievement(userId, achievement.id);
        newAchievements.push(achievement);
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }

  return newAchievements;
}

// Unlock a specific achievement
export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO user_achievements (userId, achievementId) VALUES (?, ?)',
      [userId, achievementId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Get achievements by category
export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

// Get achievement by ID
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

// Get user's achievement progress for display
export async function getUserAchievementProgress(userId: string): Promise<{
  unlocked: Achievement[];
  byCategory: Record<string, { unlocked: Achievement[]; total: number; }>;
  totalUnlocked: number;
  totalPossible: number;
}> {
  const userAchievements = await getUserAchievements(userId);
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
  
  const unlocked = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id));
  
  const byCategory: Record<string, { unlocked: Achievement[]; total: number; }> = {};
  
  for (const category of ['pollination', 'games', 'levels', 'points', 'money'] as const) {
    const categoryAchievements = getAchievementsByCategory(category);
    const unlockedInCategory = categoryAchievements.filter(a => unlockedIds.has(a.id));
    
    byCategory[category] = {
      unlocked: unlockedInCategory,
      total: categoryAchievements.length
    };
  }

  return {
    unlocked,
    byCategory,
    totalUnlocked: unlocked.length,
    totalPossible: ACHIEVEMENTS.length
  };
}

// Get display emojis for achievements in a category (for server profile)
export async function getCategoryDisplayEmojis(userId: string, category: Achievement['category']): Promise<string> {
  const progress = await getUserAchievementProgress(userId);
  const categoryData = progress.byCategory[category];
  
  if (!categoryData || categoryData.unlocked.length === 0) {
    return '❌'; // No achievements in this category
  }
  
  // Show the highest tier achievement emoji unlocked
  const sortedUnlocked = categoryData.unlocked.sort((a, b) => b.tier - a.tier);
  return sortedUnlocked[0].emoji;
}
