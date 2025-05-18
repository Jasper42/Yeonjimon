import dotenv from 'dotenv';
dotenv.config();

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  TOKEN: getEnvVar('TOKEN'),
  GUILD_ID: getEnvVar('GUILD_ID'),
  LEFTRIGHT_ID: getEnvVar('LEFTRIGHT_ID'),
  GamePingRoleId: getEnvVar('GAME_PING_ID'),
  Unbelievaboat_key: getEnvVar('unbelievaboat_api_key'),
  Guess_reward: parseInt(getEnvVar('Guess_reward_amount'), 10),
  ThreeUnique: parseInt(getEnvVar('ThreeUnique'), 10),
  ThreeMatchReward: parseInt(getEnvVar('ThreeMatchReward'), 10),
  LemonMultiplier: parseInt(getEnvVar('LemonMultiplier'), 10),
  SlotsCost: parseInt(getEnvVar('SlotsCost'), 10),
};

export default config;
