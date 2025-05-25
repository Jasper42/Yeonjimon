import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.db');

export function initDatabase(): void {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        userId TEXT PRIMARY KEY,
        username TEXT,
        points INTEGER DEFAULT 0
      )
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
    (error, rows) => {
      if (error) {
        reject(error);
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

