import sqlite3 from 'sqlite3';
import path from 'path';

const db: sqlite3.Database = new sqlite3.Database(path.resolve(__dirname, '../../database.db'));

/**
 * Get the number of pollinations for a user.
 */
export async function getUserPollinationCount(userId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT COUNT(*) as count FROM pollinations WHERE userId = ?',
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows[0] as { count: number })?.count || 0);
      }
    );
  });
}

/**
 * Get the total number of pollinations in the server.
 */
export async function getTotalPollinations(): Promise<number> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT COUNT(*) as count FROM pollinations',
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows[0] as { count: number })?.count || 0);
      }
    );
  });
}
