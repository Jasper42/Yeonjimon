import axios from 'axios';
import config from '../config';

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
