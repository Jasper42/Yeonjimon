import sqlite3 from 'sqlite3';
const db: sqlite3.Database = new sqlite3.Database('./database.db');

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add new columns if they don't exist (for migration)
    db.run(`ALTER TABLE user_profiles ADD COLUMN pointsFromAssists INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE user_profiles ADD COLUMN moneyFromAssists INTEGER DEFAULT 0`, () => {});
    
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
              totalPoints: leaderboardRow?.points || 0
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

export function recordAssistReward(userId: string, username: string, points: number): void {
  createUserProfile(userId, username);
  db.run(
    `
    UPDATE user_profiles 
    SET pointsFromAssists = pointsFromAssists + ?,
        username = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [points, username, userId]
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

