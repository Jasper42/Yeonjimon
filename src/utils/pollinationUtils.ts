import { db } from './pointsManager';

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

/**
 * Extract pollination numbers from message content (emoji sequences).
 */
export function extractPollinationNumbers(content: string): number[] {
  const emojiToDigit: Record<string, string> = {
    '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
    '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  };

  // Match all consecutive digit emoji sequences (optionally separated by spaces)
  // This will match things like "6️⃣9️⃣", "6️⃣ 9️⃣", but not across non-emoji chars like "+"
  const matches = content.match(/([0-9]️⃣ ?)+/g);
  if (!matches) return [];

  const numbers: number[] = [];
  for (const match of matches) {
    // Remove spaces, then split into emojis
    const digits = match.replace(/ /g, '').match(/[0-9]️⃣/g);
    if (digits && digits.length > 0) {
      const numStr = digits.map(e => emojiToDigit[e]).join('');
      const num = parseInt(numStr);
      if (!isNaN(num) && num > 0) {
        numbers.push(num);
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(numbers)].sort((a, b) => a - b);
}
