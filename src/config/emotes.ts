/**
 * Simple emote configuration for Yeonji bot
 * Maps emotes to their emotional context for AI personality
 */

export const EMOTES = {
  // Custom server emotes (add your server's emotes here)
  // Format: '<:emoteName:123456789>': 'emotion description',
  
  // Examples (replace with your actual server emotes):
  // '<:yeonji_happy:123456789>': 'happy, cheerful, excited',
  // '<:yeonji_love:123456789>': 'love, affection, heart',
  // '<:yeonji_wink:123456789>': 'flirty, playful, teasing',
  // '<:yeonji_smug:123456789>': 'confident, sassy, superior',
  // '<:yeonji_sparkle:123456789>': 'magical, sparkly, amazing',
} as const;

/**
 * Get all emotes as a formatted string for AI prompts
 */
export function getEmotesForAI(): string {
  return Object.entries(EMOTES)
    .map(([emote, emotion]) => `${emote} (${emotion})`)
    .join(', ');
}
