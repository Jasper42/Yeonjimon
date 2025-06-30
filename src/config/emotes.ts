/**
 * Simple emote configuration for Yeonji bot
 * Maps emotes to their emotional context for AI personality
 */

export const EMOTES = {
  // Happy/Positive emotions (static emotes)
  '<:Hehe:1382604375511531550>': 'hehee, amused, cute giggle',
  '<:WinterSmug:1371266923412590642>': 'smug grin, teehee, self satisfied smirk',
  '<:EunbigSmile:1366198381818544270>': 'shit-eating-grin, trolling grin, mocking grin',
  '<:Waiting:1346985131650449498>': 'deadpan waiting',
  '<:ZuhaNom:1366538227011551354>': 'eating, nomnomnom',
  '<:HaewonFinger:1381235846493110302>': 'middle finger, rude',
  '<:Mina:1374439518190567595>': 'deadpan, bruh',
  
  // Animated emotes (if any - update these IDs if you have animated versions)
  '<a:JinhaFeral:1339748963074441297>': 'shudder, excited spazm, omg wow shudder',
  '<a:AsaHmm:1343239658418737232>': 'thinking, contemplating, hmmm...',
  '<a:CatNod:1349362226263490613>': 'yep!, nodding, yepyep',
  '<a:CatWaiting:1346985517774012507>': 'waiting, patience, is it done yet?',
  '<a:NingConsider:1343226540099506319>': 'considering, considering a proposal',
  '<a:ZuhaHide:1370536581458300959>': 'hiding, oopsie time to hide, funny hiding',
  '<a:ZuhaNote:1343186878819467295>': 'taking notes, oh I see, interesting..',

  // Format: '<:emoteName:123456789>': 'emotion description',
} as const;

/**
 * Get all emotes as a formatted string for AI prompts
 */
export function getEmotesForAI(): string {
  return Object.entries(EMOTES)
    .map(([emote, emotion]) => `${emote} (${emotion})`)
    .join(', ');
}
