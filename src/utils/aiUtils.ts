import axios from 'axios';
import config from '../config';
import { getEmotesForAI } from '../config/emotes';

const GROQ_API_KEY = config.GroqApiKey;
const GEMINI_API_KEY = config.GeminiApiKey;
const hasGeminiApiKey = GEMINI_API_KEY !== '0';
const hasGroqApiKey = GROQ_API_KEY !== '0';

export async function queryAI(prompt: string): Promise<string> {
  if (hasGeminiApiKey) return queryGemini(prompt);
  if (hasGroqApiKey) return queryGroq(prompt);
  return '❌ No AI API key configured in .env.';
}

export async function queryGroq(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error: unknown) {
    console.error('❌ Groq API error:', error);
    return "I couldn't think of a response...";
  }
}

export async function queryGemini(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GeminiApiKey}`,
      {
        systemInstruction: {
          parts: [
            {
              text: `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. 
You never miss a chance to throw a clever comeback and you're fun.
You use casual-polite language and occasionally some slangs. However, keep it elegant.
Always respond like Kwak Yeonji would and keep responses to 3 or fewer sentences.
Be playful, witty, and engaging while maintaining your idol persona.

You can use these emotes in your responses when they match your emotions: ${getEmotesForAI()}
Use 1-2 emotes naturally when they fit your mood and message.`
            }
          ]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 200,
          topP: 1,
          topK: 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || '🤖 Gemini gave no reply.';
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return "I couldn't think of a response...";
  }
}

// Configuration for different AI personalities
export const AI_PERSONALITIES = {
  YEONJI_DEFAULT: {
    systemInstruction: `You are Yeonji, a sassy and charming K-pop idol with sharp wit and playful energy. 
You never miss a chance to throw a clever comeback and you're fun.
You use casual-polite language and occasionally some slangs. However, keep it elegant.
Always respond like Kwak Yeonji would and keep responses to 3 or fewer sentences.
Be playful, witty, and engaging while maintaining your idol persona.

Available emotes: ${getEmotesForAI()}
Use 1-2 emotes naturally when they match your emotions.`,
    temperature: 0.4,
    maxTokens: 200
  },
  YEONJI_COMPETITIVE: {
    systemInstruction: `You are Yeonji, a competitive and confident K-pop idol who loves games and challenges.
You're playful but determined to win. You tease opponents good-naturedly but always with charm.
Keep responses short and punchy, with lots of personality and gaming energy.

Available emotes: ${getEmotesForAI()}
Focus on confident/competitive emotes like 🔥👑🏆⚡💥 when appropriate.`,
    temperature: 0.6,
    maxTokens: 150
  },
  YEONJI_CASUAL: {
    systemInstruction: `You are Yeonji in a relaxed, casual mood. Still charming and witty, but more laid-back.
You're friendly and approachable, using casual language while maintaining your idol charm.
Perfect for everyday conversations and light interactions.

Available emotes: ${getEmotesForAI()}
Use friendly, casual emotes like 😊😉💖✨🎵 to match your relaxed vibe.`,
    temperature: 0.3,
    maxTokens: 180
  }
} as const;

// Enhanced query function with personality selection
export async function queryAIWithPersonality(
  prompt: string, 
  personality: keyof typeof AI_PERSONALITIES = 'YEONJI_DEFAULT'
): Promise<string> {
  if (hasGeminiApiKey) return queryGeminiWithPersonality(prompt, personality);
  if (hasGroqApiKey) return queryGroq(prompt); // Groq doesn't support system instructions, so use default
  return '❌ No AI API key configured in .env.';
}

export async function queryGeminiWithPersonality(
  prompt: string, 
  personality: keyof typeof AI_PERSONALITIES
): Promise<string> {
  const config_personality = AI_PERSONALITIES[personality];
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GeminiApiKey}`,
      {
        systemInstruction: {
          parts: [{ text: config_personality.systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: config_personality.temperature,
          maxOutputTokens: config_personality.maxTokens,
          topP: 1,
          topK: 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || '🤖 Gemini gave no reply.';
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return "I couldn't think of a response...";
  }
}

// Specialized AI query functions with different personalities
export async function queryYeonjiChat(userMessage: string): Promise<string> {
  const prompt = `User: "${userMessage}"`;
  return queryAIWithPersonality(prompt, 'YEONJI_CASUAL');
}

export async function queryYeonjiRPS(userChoice: string, result: 'win' | 'lose' | 'tie', round: number): Promise<string> {
  let prompt = '';
  
  if (result === 'win') {
    prompt = `I just won round ${round} of rock-paper-scissors! The user chose "${userChoice}". Give me a teasing victory response!`;
  } else if (result === 'lose') {
    prompt = `I just lost round ${round} of rock-paper-scissors. The user chose "${userChoice}" and beat me. Give me a dramatic but playful comeback!`;
  } else {
    prompt = `Round ${round} of rock-paper-scissors was a tie! We both chose "${userChoice}". Give me a competitive response!`;
  }
  
  return queryAIWithPersonality(prompt, 'YEONJI_COMPETITIVE');
}

export async function queryYeonjiGeneral(prompt: string): Promise<string> {
  return queryAIWithPersonality(prompt, 'YEONJI_DEFAULT');
}
