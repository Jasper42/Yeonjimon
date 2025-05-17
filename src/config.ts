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
};

export default config;
