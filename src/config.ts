import dotenv from 'dotenv';
dotenv.config();

function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? '';
}

interface BotConfig {
  isDev: boolean;
  DEV_CHANNEL_ID: string;
  TOKEN: string;
  GUILD_ID: string;
  LEFTRIGHT_ID: string;
  POLLINATION_CHANNEL_ID: string;
  LEVEL_CHANNEL_ID: string;
  ADMIN_USER_IDS: string[];
  GamePingRoleId: string;
  Unbelievaboat_key: string;
  Guess_reward: number;
  ThreeUnique: number;
  ThreeMatchReward: number;
  LemonMultiplier: number;
  SlotsCost: number;
  GroqApiKey: string;
  GeminiApiKey: string;
}

const config: BotConfig = {
  isDev: (getEnvVar('isDev', false) ?? 'false') === 'true',
  DEV_CHANNEL_ID: getEnvVar('DEV_CHANNEL_ID', false) ?? '',
  TOKEN: getEnvVar('TOKEN'),
  GUILD_ID: getEnvVar('GUILD_ID'),
  LEFTRIGHT_ID: getEnvVar('LEFTRIGHT_ID'),
  POLLINATION_CHANNEL_ID: getEnvVar('POLLINATION_CHANNEL_ID'),
  LEVEL_CHANNEL_ID: getEnvVar('LEVEL_CHANNEL_ID'),
  ADMIN_USER_IDS: getEnvVar('ADMIN_USER_IDS').split(',').map(id => id.trim()).filter(id => id.length > 0),
  GamePingRoleId: getEnvVar('GAME_PING_ID'),
  Unbelievaboat_key: getEnvVar('unbelievaboat_api_key'),
  Guess_reward: parseInt(getEnvVar('Guess_reward_amount'), 10),
  ThreeUnique: parseInt(getEnvVar('ThreeUnique'), 10),
  ThreeMatchReward: parseInt(getEnvVar('ThreeMatchReward'), 10),
  LemonMultiplier: parseInt(getEnvVar('LemonMultiplier'), 10),
  SlotsCost: parseInt(getEnvVar('SlotsCost'), 10),
  GroqApiKey: getEnvVar('groq_api_key'),
  GeminiApiKey: getEnvVar('gemini_api_key'),
};

export default config;

