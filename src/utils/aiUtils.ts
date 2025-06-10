import axios from 'axios';
import config from '../config';
const GROQ_API_KEY = config.GroqApiKey;

export async function queryGroq(prompt: string): Promise<string> {
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