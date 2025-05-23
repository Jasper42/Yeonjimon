import { Client, Events, InteractionCallback, TextChannel } from 'discord.js';
import { registerCommands } from './registerCommands';
import config from './config';
import { awardCurrency } from './utils/unbelieva';
import { subtractCurrency } from './utils/unbelieva';
import axios from 'axios';

interface GameSession {
  target: string;
  limit: number;
  groupname?: string;
  active: boolean;
  players: Record<string, number>;
  starterId: string;
}

const GROQ_API_KEY = config.GroqApiKey;
const gameSessions: Record<string, GameSession> = {};
const numberEmoji: Record<number, string> = {
  0: '0️⃣',
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
  10: '🔟'
};

const groqCooldowns: Record<string, boolean> = {};
const groqQueue: Record<string, string[]> = {};



async function queryGroq(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192', // or 'mixtral-8x7b-32768'
        messages: [
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Groq API error:', error);
    return "I couldn't think of a response...";
  }
}


export function setupEventHandlers(client: Client) {
  client.once(Events.ClientReady, async () => {
    if (!client.user) {
      console.error('❌ client.user is undefined!');
      return;
    }

    console.log(`🤖 Logged in as ${client.user.tag}`);
    await registerCommands(client.user.id);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const channelId = interaction.channel?.id;
    const session = channelId ? gameSessions[channelId] : undefined;
    const slotsCost = config.SlotsCost;
    const userId = interaction.user.id;

    if (interaction.commandName === 'slots') {
      const reel1 = [
        ':butterfly:',
        ':four_leaf_clover:',
        ':cherries:',
        ':lemon:',
        ':star:',
      ];

      const reel2 = [
        ':star:',
        ':lemon:',
        ':cherries:',
        ':four_leaf_clover:',
        ':butterfly:',
      ];

      const reel3 = [
        ':four_leaf_clover:',
        ':star:',
        ':butterfly:',
        ':cherries:',
        ':lemon:',
      ];

      const index1 = Math.floor(Math.random() * reel1.length);
      const index2 = Math.floor(Math.random() * reel2.length);
      const index3 = Math.floor(Math.random() * reel3.length);

      const result = `
  ${reel1[(index1 - 1 + reel1.length) % reel1.length]} | ${reel2[(index2 - 1 + reel2.length) % reel2.length]} | ${reel3[(index3 - 1 + reel3.length) % reel3.length]}
  ${reel1[index1]} | ${reel2[index2]} | ${reel3[index3]}
  ${reel1[(index1 + 1) % reel1.length]} | ${reel2[(index2 + 1) % reel2.length]} | ${reel3[(index3 + 1) % reel3.length]}
  `;

      const slots = [reel1[index1], reel2[index2], reel3[index3]];
      let winnings = 0;

      const ThreeUniqueSlots = config.ThreeUnique;
      const threeMatchReward = config.ThreeMatchReward;
      const lemonMultiplier = config.LemonMultiplier;

      const isLemon = (slot: string) => slot === ':lemon:';
      const hasThreeLemons = slots.filter(isLemon).length === 3;

      if (slots[0] === slots[1] && slots[0] === slots[2]) {
        winnings = hasThreeLemons ? threeMatchReward * lemonMultiplier : threeMatchReward;
        const announcement = hasThreeLemons ? 'Jackpot!!!' : 'Congratulations!';
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
        
        await awardCurrency(userId, winnings);

      } else if (slots[0] !== slots[1] && slots[0] !== slots[2] && slots[1] !== slots[2]) {
        winnings = hasThreeLemons ? ThreeUniqueSlots * lemonMultiplier : ThreeUniqueSlots;
        const announcement = hasThreeLemons ? 'mini jackpot!' : 'Good job!';
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**${announcement} You won ${winnings} coins!**` });
        
        await awardCurrency(userId, winnings);

      } else {
        await interaction.reply({ content: `**Slot Machine Result:**\n${result}\n**Better luck next time! -${slotsCost} coins.**` });
        await subtractCurrency(userId, slotsCost);
      }
    }

    if (interaction.commandName === 'start') {
      const name = interaction.options.getString('name')!.toLowerCase();
      const limit = interaction.options.getInteger('limit') ?? 0;
      const groupName = interaction.options.getString('group')?.toLowerCase();

      if (session?.active) {
        await interaction.reply({ content: '⚠️ A game is already active!', ephemeral: true });
        return;
      }

      if (!channelId) {
        await interaction.reply({ content: '❌ Channel ID is undefined.', ephemeral: true });
        return;
      }

      gameSessions[channelId] = {
        target: name,
        limit,
        groupname: groupName,
        active: true,
        players: {},
        starterId: userId
      };

      await interaction.reply({ content: `✅ Game started with ${limit} tries.`, ephemeral: true });

      const gamePingRoleId = config.GamePingRoleId;
      const textChannel = interaction.channel as TextChannel;
      if (textChannel?.send) {
        let gameAnnouncement = `<@${userId}> started a 🎮 Guess-the-Idol 🎮 game! \nType \`!idolname\` to guess. You have **${limit}** tries.`;
        if (groupName) {
          gameAnnouncement += `\nA group name has been provided!`;
        }
        if (gamePingRoleId == '0') {
          await textChannel.send(gameAnnouncement);
        } else {
          await textChannel.send(`${gameAnnouncement} <@&${gamePingRoleId}>`);
        }
      }
    }

    else if (interaction.commandName === 'end') {
      if (!session?.active) {
        await interaction.reply({ content: 'No game to end.', ephemeral: true });
        return;
      }
      session.active = false;
      await interaction.reply('🛑 Game ended.');
    }

    if (interaction.commandName === 'chat') {
      const prompt = interaction.options.getString('prompt');
      if (!prompt) {
        await interaction.reply({ content: 'You didn\'t say anything.'});
        return;
      }

      try {
        const persona = `
    You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. 
    You never miss a chance to throw a clever comeback, but you're fun and never rude.
    You use casual-polite language and occasionally some slangs. However, keep it elegent.
    Respond to the following message like Kwak Yeonji would:
    `;

        const finalPrompt = `${persona}\nUser: "${prompt}"\nYeonji:`;

        const aiReply = await queryGroq(finalPrompt);
        await interaction.reply(aiReply);
      } catch (err) {
        console.error('❌ Failed to get Groq response:', err);
        await interaction.reply({ content: '❌ Failed to get a response from Groq.', ephemeral: true });
      }
    }
  });

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.channel.id === config.LEFTRIGHT_ID && message.attachments.size > 0) {
      for (const [, attachment] of message.attachments) {
        if (attachment.contentType?.startsWith('image') || attachment.contentType?.startsWith('video')) {
          try {
            await message.react('⬅️');
            await message.react('➡️');
          } catch (err) {
            console.error('❌ Could not add reactions:', err);
          }
        }
      }
    }
    
    // if (message.channel.id === config.SizeChannelId && message.content.startsWith('!size')) {
    //   // Wait for the bot's response (likely right after this message)
    //   const channel = message.channel;

    //   try {
    //     // Wait for the other bot's reply (assumed within 5 seconds)
    //     const filter = (m: any) => m.author.bot && m.reference?.messageId === message.id;
    //     const collected = await channel.awaitMessages({ filter, max: 1, time: 5000 });
    //     const botReply = collected.first();
    //     if (!botReply) return;

    //     // Extract the size number from the bot's reply
    //     const match = botReply.content.match(/(\d+)/);
    //     if (!match) return;
    //     const size = parseInt(match[1]);

    //     const displayName = message.member?.displayName || message.author.username;

    //     // Construct prompt for Groq AI based on size
    //     const prompt = size < 5
    //       ? `Make a playful, witty roast about a K-pop fan named ${displayName} whose "size" is ${size} inches.`
    //       : `Make a playful, witty compliment about a K-pop fan named ${displayName} whose "size" is ${size} inches.`;

    //     const aiReply = await queryGroq(prompt);
    //     await message.reply(aiReply);

    //   } catch (err) {
    //     console.error('❌ Failed to respond to !size command with Groq:', err);
    //   }
    // }

    if (message.content.startsWith('!')) {
      const channelId = message.channel.id;
      const session = gameSessions[channelId];
      if (!session?.active) return;

      const guess = message.content.slice(1).trim().toLowerCase();
      const userId = message.author.id;
      const username = message.author.toString();
      const guesses = session.players[userId] ?? 0;

      if (guesses >= session.limit) {
        await message.react('☠️');
        return;
      }

      if (guess === session.target) {
        session.active = false;
        const guess_reward = config.Guess_reward;
        const starterReward = Math.ceil(guess_reward * 0.60);

        await message.channel.send(`🎉 ${username} guessed right! It was **${session.target}**. +${guess_reward} coins awarded! \nA percentage of the prize was also given to the coordinator. +${starterReward} `);
        await awardCurrency(userId, guess_reward);
        await awardCurrency(session.starterId, starterReward);

      } else if (session.groupname && guess === session.groupname) {
        await message.react('✅');
      
      } else {
        session.players[userId] = guesses + 1;
        const remaining = session.limit - session.players[userId];

        try {
          await message.react('❌');
          if (remaining >= 0 && remaining <= 10) {
            await message.react(numberEmoji[remaining]);
          }
          if (session.players[userId] >= session.limit) {
            await message.react('☠️');
          }

          // GROQ AI
          const channelId = message.channel.id;
          const userName = message.member?.displayName || message.author.username;
          const isLowGuesses = remaining <= 2;

          const hintPrompt = isLowGuesses
            ? `${userName} guessed "${guess}" but it's wrong. The correct answer is "${session.target}". Respond with a slightly short, witty, and playful message (not mean), and give a gentle hint about the idol. Do NOT reveal the name.`
            : `${userName} guessed "${guess}" for a K-pop idol, but it's wrong. Respond with a slightly short, witty, and playful message (not mean or rude).`;

          // Cooldown logic
          if (!groqCooldowns[channelId]) {
            groqCooldowns[channelId] = true;
            const aiReply = await queryGroq(hintPrompt);
            await message.reply(aiReply);

            // Reset after 7 seconds and check queue
            setTimeout(async () => {
              groqCooldowns[channelId] = false;

              if (groqQueue[channelId]?.length > 0) {
                const replies = groqQueue[channelId].join(', ');
                const generalPrompt = isLowGuesses
                  ? `Multiple people guessed (${replies}) but all were wrong. The answer is "${session.target}". Respond with a slightly short, playful and teasing message. Give a light hint about the idol. Do NOT reveal the name.`
                  : `Multiple users guessed (${replies}) and were wrong. Respond with a slightly short and witty group comment, playful and fun.`;
                
                const generalReply = await queryGroq(generalPrompt);
                await message.channel.send(generalReply);
                groqQueue[channelId] = [];
              }
            }, 10000);

          } else {
            // If on cooldown, queue the guess
            if (!groqQueue[channelId]) groqQueue[channelId] = [];
            groqQueue[channelId].push(guess);
          }

        } catch (err) {
          console.error('❌ Failed to react to guess message:', err);
        }
      }

    }
  });
}

