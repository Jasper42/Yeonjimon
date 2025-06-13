import { queryGroq } from './aiUtils';
import { groqCooldowns, groqQueue } from './botConstants';

export async function handleGuessCooldown(
  channelId: string,
  guess: string,
  remaining: number,
  session: { target: string },
  userName: string,
  send: (msg: string) => Promise<any>
) {
  if (!groqCooldowns[channelId]) {
    groqCooldowns[channelId] = true;

    const hintPrompt = remaining <= 2
      ? `${userName} guessed "${guess}" but it's wrong. Respond with a slightly short, witty, and playful message, and give a gentle hint about the idol. Keep it 3 sentences or shorter. "${session.target}" is the answer and you're not supposed to reveal it.`
      : `${userName} guessed "${guess}" for a K-pop idol, but it's wrong. Respond with a slightly short, witty, and playful message. Keep it 3 sentences or shorter.`;

    const aiReply = await queryGroq(hintPrompt);
    await send(aiReply);

    // Cooldown reset
    setTimeout(async () => {
      groqCooldowns[channelId] = false;

      if (groqQueue[channelId]?.length > 0) {
        const replies = groqQueue[channelId].join(', ');
        const generalPrompt = remaining <= 2
          ? `Multiple people guessed (${replies}) but all were wrong. Respond with a slightly short, playful and teasing message. Give a light hint about the idol. Keep it 3 sentences or shorter. "${session.target}" is the answer and you're not supposed to reveal it.`
          : `Multiple users guessed (${replies}) and were wrong. Respond with a slightly short and witty group comment, playful and fun. Keep it 3 sentences or shorter.`;

        const generalReply = await queryGroq(generalPrompt);
        await send(generalReply);
        groqQueue[channelId] = [];
      }
    }, 10000);

  } else {
    // If on cooldown, queue the guess
    if (!groqQueue[channelId]) groqQueue[channelId] = [];
    groqQueue[channelId].push(guess);
  }
}