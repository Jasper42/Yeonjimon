import { queryAI } from './aiUtils';
import { groqCooldowns, groqQueue } from './botConstants';

// Clean up inactive channel data to prevent memory leaks
export function cleanupInactiveChannels(activeChannelIds: Set<string>) {
  // Remove cooldowns and queues for channels that no longer have active games
  Object.keys(groqCooldowns).forEach(channelId => {
    if (!activeChannelIds.has(channelId)) {
      delete groqCooldowns[channelId];
    }
  });
  
  Object.keys(groqQueue).forEach(channelId => {
    if (!activeChannelIds.has(channelId)) {
      delete groqQueue[channelId];
    }
  });
}

export async function handleGuessCooldown(
  channelId: string,
  guess: string,
  remaining: number,
  session: { target: string, groupname?: string, noHints?: boolean },
  userName: string,
  send: (msg: string) => Promise<any>
) {
  const groupString = session.groupname ? `The group name is "${session.groupname}". ` : ' ';
  if (!groqCooldowns[channelId]) {
    groqCooldowns[channelId] = true;

    let hintPrompt: string;
    
    if (session.noHints) {
      // Cheeky responses instead of hints
      const cheekyPrompts = [
        `${userName} guessed "${guess}" but it's wrong. Respond with a cheeky, mocking, or playfully sarcastic message. Be funny and witty. Maybe make a pun or joke about their guess. Keep it 2-3 sentences. Don't give any hints!`,
        `${userName} guessed "${guess}" incorrectly. Reply with something funny, random, or mildly roasting. You could mention a random K-pop fact, make a meme reference, or just be playfully mean. Keep it short and entertaining. No hints allowed!`,
        `${userName} got it wrong with "${guess}". Be cheeky and entertaining! You could be mock-dramatic, make a funny comparison, reference a meme, or just tease them playfully. 2-3 sentences max. Absolutely no helpful hints!`,
        `${userName} failed with "${guess}". Time to be sassy! You could make a joke, reference something random about K-pop culture, be playfully condescending, or just say something completely unexpected. Keep it fun and short. Zero hints!`,
        `${userName} missed with "${guess}". Be witty and maybe a little mean (but in a fun way)! You could make a pun, reference a random fact, be dramatically disappointed, or just roast their guess lightly. 2-3 sentences. No helpful information whatsoever!`
      ];
      hintPrompt = cheekyPrompts[Math.floor(Math.random() * cheekyPrompts.length)];
    } else {
      // Original hint logic
      hintPrompt = remaining <= 2
        ? `${userName} guessed "${guess}" but it's wrong. Respond with a slightly short, witty, and playful message, and give a gentle hint about the idol. Keep it 3 sentences or shorter.Give the player a hint about the idol. If you have any online information about the idol, try to hint with it. Otherwise try to help them figure out the name with maybe a rhyme hint or in some other smart/entertaining way. "${session.target}" is the idol they're trying to guess and you're not supposed to explicitly say the name or the group name. ${groupString}`
        : `${userName} guessed "${guess}" as the kpop idol in the picture, but it's wrong. Respond with a slightly short, witty, and playful message. Keep it 3 sentences or shorter.`;
    }

    const aiReply = await queryAI(hintPrompt);
    await send(aiReply);

    // Cooldown reset
    setTimeout(async () => {
      groqCooldowns[channelId] = false;

      if (groqQueue[channelId]?.length > 0) {
        // Extract unique guesses and users from the queue
        const queueItems = groqQueue[channelId].map(item => {
          const [user, guess] = item.split(':');
          return { user, guess };
        });
        
        const uniqueUsers = [...new Set(queueItems.map(item => item.user))];
        const uniqueGuesses = [...new Set(queueItems.map(item => item.guess))];
        
        // Only respond to queued guesses if there are multiple different users OR multiple different guesses
        // This prevents double responses when one person guesses multiple times
        if (uniqueUsers.length >= 2 || uniqueGuesses.length >= 2) {
          const replies = uniqueGuesses.join(', ');
          let generalPrompt: string;
          
          if (session.noHints) {
            // Cheeky group responses
            const cheekyGroupPrompts = [
              `Multiple people guessed (${replies}) but all were wrong. Respond with a playful group roast or funny observation about their collective failure. Be entertaining and maybe dramatic. 2-3 sentences max. No hints!`,
              `Everyone guessed wrong: ${replies}. Time for some group mockery! Be witty about their shared failure, maybe make a joke about their taste or guessing skills. Keep it fun and sassy. Zero helpful information!`,
              `Multiple wrong guesses: ${replies}. Give them a funny group response! You could be mock-shocked, make a meme reference, or just playfully despair at their guessing abilities. Short and entertaining only!`,
              `People tried ${replies} and failed spectacularly. Be cheeky about their collective wrongness! Maybe reference how far off they are (without being helpful), make a joke, or just be dramatically unimpressed. No hints allowed!`,
              `Wrong answers galore: ${replies}. Time to address the group with some playful sass! You could joke about their coordination, make a random K-pop reference, or just be amusingly disappointed. Keep it short and unhelpful!`
            ];
            generalPrompt = cheekyGroupPrompts[Math.floor(Math.random() * cheekyGroupPrompts.length)];
          } else {
            // Original group hint logic
            generalPrompt = remaining <= 2
              ? `Multiple people guessed (${replies}) but all were wrong. Respond with a slightly short, playful and teasing message. Give a light hint about the idol. Keep it 3 sentences or shorter. Give the players a hint about the idol. If you have any online information about the idol, try to hint with it. Otherwise try to help them figure out the name with maybe a rhyme hint or in some other smart/entertaining way. "${session.target}" is the idol they're trying to guess and you're not supposed to explicitly say the name or the group name. ${groupString}`
              : `Multiple users guessed the idol in the picture's name to be (${replies}) and were wrong. Respond with a slightly short and witty group comment, playful and fun. Keep it 3 sentences or shorter.`;
          }

          const generalReply = await queryAI(generalPrompt);
          await send(generalReply);
        }
        groqQueue[channelId] = [];
      }
    }, 10000);

  } else {
    // If on cooldown, queue the guess with user info
    if (!groqQueue[channelId]) groqQueue[channelId] = [];
    // Only queue if this user hasn't already guessed the same thing recently
    const recentGuess = `${userName}:${guess}`;
    if (!groqQueue[channelId].includes(recentGuess)) {
      groqQueue[channelId].push(recentGuess);
    }
  }
}