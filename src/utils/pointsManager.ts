import sqlite3 from 'sqlite3';
import { initAchievementDatabase } from './achievementUtils';
export const db: sqlite3.Database = new sqlite3.Database('./database.db');

export function initDatabase(): void {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        userId TEXT PRIMARY KEY,
        username TEXT,
        points INTEGER DEFAULT 0
      )
    `);
    
    // Enhanced user profiles table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        userId TEXT PRIMARY KEY,
        username TEXT,
        gamesStarted INTEGER DEFAULT 0,
        gamesWon INTEGER DEFAULT 0,
        pointsFromStarting INTEGER DEFAULT 0,
        pointsFromGuessing INTEGER DEFAULT 0,
        pointsFromAssists INTEGER DEFAULT 0,
        pointsFromWinning INTEGER DEFAULT 0,
        moneyFromStarting INTEGER DEFAULT 0,
        moneyFromGuessing INTEGER DEFAULT 0,
        moneyFromAssists INTEGER DEFAULT 0,
        moneyFromWinning INTEGER DEFAULT 0,
        bio TEXT,
        favorite_idol_name TEXT,
        favorite_idol_image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns if they don't exist (for migration)
    db.run(`ALTER TABLE user_profiles ADD COLUMN pointsFromAssists INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE user_profiles ADD COLUMN moneyFromAssists INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE user_profiles ADD COLUMN bio TEXT`, () => {});
    db.run(`ALTER TABLE user_profiles ADD COLUMN favorite_idol_name TEXT`, () => {});
    db.run(`ALTER TABLE user_profiles ADD COLUMN favorite_idol_image_url TEXT`, () => {});

    // Migration: Copy data from old columns to new columns
    db.run(`
      UPDATE user_profiles 
      SET pointsFromAssists = COALESCE(pointsFromGuessing, 0) 
      WHERE pointsFromAssists = 0 AND pointsFromGuessing > 0
    `);
    db.run(`
      UPDATE user_profiles 
      SET moneyFromAssists = COALESCE(moneyFromGuessing, 0) 
      WHERE moneyFromAssists = 0 AND moneyFromGuessing > 0
    `);
    
    // Pollinations table for tracking sequential pollination numbers
    db.run(`
      CREATE TABLE IF NOT EXISTS pollinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        pollination_number INTEGER NOT NULL,
        message_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        content_numbers TEXT,
        UNIQUE(message_id, pollination_number)
      )
    `);
    
    // Add content_numbers column if it doesn't exist (for migration)
    db.run(`ALTER TABLE pollinations ADD COLUMN content_numbers TEXT`, () => {});
    
    // Check if we need to update the unique constraint
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='pollinations'", (err, row: any) => {
      if (row && row.sql.includes('UNIQUE(userId, pollination_number)')) {
        console.log('Note: Pollinations table has old schema. Consider running reset command to rebuild with sequential numbering.');
      }
    });
    
    // Pollination progress table for scan resume support
    db.run(`CREATE TABLE IF NOT EXISTS pollination_progress (
      channel_id TEXT PRIMARY KEY,
      last_id TEXT
    )`);

    // Free spins table for slots game
    db.run(`CREATE TABLE IF NOT EXISTS user_free_spins (
      userId TEXT PRIMARY KEY,
      spins INTEGER DEFAULT 0
    )`);

    // Initialize achievement tables
    initAchievementDatabase();
  });
}

export function addPoints(userId: string, username: string, pointsToAdd: number): void {
  db.run(
    `
    INSERT INTO leaderboard (userId, username, points)
    VALUES (?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      points = points + ?,
      username = excluded.username
    `,
    [userId, username, pointsToAdd, pointsToAdd]
  );
}

export function subtractPoints(userId: string, pointsToSubtract: number): void {
  db.run(
    `
    UPDATE leaderboard
    SET points = points - ?
    WHERE userId = ?
    `,
    [pointsToSubtract, userId]
  );
}

export function removePlayer(userId: string): void {
  db.run(
    `
    DELETE FROM leaderboard
    WHERE userId = ?
    `,
    [userId]
  );
}

export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  return new Promise<LeaderboardEntry[]>((resolve, reject) => {
    db.all(
      `
      SELECT userId, username, points
      FROM leaderboard
      ORDER BY points DESC
      LIMIT ?
      `,
      [limit],
      (error: Error | null, rows: any[]) => {
        if (error) {
          reject(error);
          return;
        }
        if (!rows || rows.length === 0) {
          return resolve([]);
        }
        const leaderboardEntries = rows.map((row: any) => ({
          userId: row.userId,
          username: row.username,
          points: row.points,
        }));
        resolve(leaderboardEntries);
      }
    );
  });
}

export interface LeaderboardEntry {
  readonly userId: string;
  readonly username: string;
  readonly points: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  gamesStarted: number;
  gamesWon: number;
  pointsFromStarting: number;
  pointsFromAssists: number;
  pointsFromWinning: number;
  moneyFromStarting: number;
  moneyFromAssists: number;
  moneyFromWinning: number;
  totalPoints: number; // from leaderboard
  bio?: string;
  favorite_idol_name?: string;
  favorite_idol_image_url?: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return new Promise<UserProfile | null>((resolve, reject) => {
    // First get points from leaderboard table
    db.get(
      `SELECT points FROM leaderboard WHERE userId = ?`,
      [userId],
      (error: Error | null, leaderboardRow: any) => {
        if (error) {
          reject(error);
          return;
        }

        // Then get profile data
        db.get(
          `SELECT * FROM user_profiles WHERE userId = ?`,
          [userId],
          (error: Error | null, profileRow: any) => {
            if (error) {
              reject(error);
              return;
            }

            if (!profileRow && !leaderboardRow) {
              resolve(null);
              return;
            }

            // Create profile combining both sources
            const profile: UserProfile = {
              userId: userId,
              username: profileRow?.username || 'Unknown User',
              gamesStarted: profileRow?.gamesStarted || 0,
              gamesWon: profileRow?.gamesWon || 0,
              pointsFromStarting: profileRow?.pointsFromStarting || 0,
              pointsFromAssists: profileRow?.pointsFromAssists || profileRow?.pointsFromGuessing || 0,
              pointsFromWinning: profileRow?.pointsFromWinning || 0,
              moneyFromStarting: profileRow?.moneyFromStarting || 0,
              moneyFromAssists: profileRow?.moneyFromAssists || profileRow?.moneyFromGuessing || 0,
              moneyFromWinning: profileRow?.moneyFromWinning || 0,
              totalPoints: leaderboardRow?.points || 0,
              bio: profileRow?.bio || '',
              favorite_idol_name: profileRow?.favorite_idol_name || '',
              favorite_idol_image_url: profileRow?.favorite_idol_image_url || ''
            };

            resolve(profile);
          }
        );
      }
    );
  });
}

export async function getProfileRank(userId: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) + 1 as rank 
      FROM leaderboard 
      WHERE points > (SELECT points FROM leaderboard WHERE userId = ?)
      `,
      [userId],
      (error: Error | null, row: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(row?.rank || 999);
      }
    );
  });
}

export function createUserProfile(userId: string, username: string): void {
  db.run(
    `
    INSERT OR IGNORE INTO user_profiles (userId, username)
    VALUES (?, ?)
    `,
    [userId, username]
  );
}

export function updateProfileStats(userId: string, stats: Partial<UserProfile>): void {
  const fields = Object.keys(stats).filter(key => key !== 'userId').map(key => `${key} = ?`);
  const values = Object.keys(stats).filter(key => key !== 'userId').map(key => (stats as any)[key]);
  
  if (fields.length === 0) return;

  db.run(
    `
    UPDATE user_profiles 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [...values, userId]
  );
}

export function incrementGameStarted(userId: string, username: string): void {
  createUserProfile(userId, username);
  db.run(
    `
    UPDATE user_profiles 
    SET gamesStarted = gamesStarted + 1, username = ?, updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [username, userId]
  );
}

export function recordGameWin(userId: string, username: string, points: number, money: number): void {
  createUserProfile(userId, username);
  db.run(
    `
    UPDATE user_profiles 
    SET gamesWon = gamesWon + 1, 
        pointsFromWinning = pointsFromWinning + ?,
        moneyFromWinning = moneyFromWinning + ?,
        username = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [points, money, username, userId]
  );
}

export function recordStarterReward(userId: string, username: string, points: number, money: number): void {
  createUserProfile(userId, username);
  db.run(
    `
    UPDATE user_profiles 
    SET pointsFromStarting = pointsFromStarting + ?,
        moneyFromStarting = moneyFromStarting + ?,
        username = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [points, money, username, userId]
  );
}

export function recordAssistReward(userId: string, username: string, points: number, money: number = 0): void {
  createUserProfile(userId, username);
  db.run(
    `
    UPDATE user_profiles 
    SET pointsFromAssists = pointsFromAssists + ?,
        moneyFromAssists = moneyFromAssists + ?,
        username = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [points, money, username, userId]
  );
}

export async function getTotalServerGames(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    db.get(
      `SELECT SUM(gamesStarted) as totalGames FROM user_profiles`,
      (error: Error | null, row: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(row?.totalGames || 0);
      }
    );
  });
}

// Free spins management functions
export async function getFreeSpins(userId: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    db.get(
      `SELECT spins FROM user_free_spins WHERE userId = ?`,
      [userId],
      (error: Error | null, row: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(row?.spins || 0);
      }
    );
  });
}

export async function addFreeSpins(userId: string, spinsToAdd: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO user_free_spins (userId, spins) VALUES (?, ?)
       ON CONFLICT(userId) DO UPDATE SET spins = spins + ?`,
      [userId, spinsToAdd, spinsToAdd],
      (error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

export async function decrementFreeSpins(userId: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    db.run(
      `UPDATE user_free_spins SET spins = spins - 1 WHERE userId = ? AND spins > 0`,
      [userId],
      function(error: Error | null) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.changes > 0);
      }
    );
  });
}

