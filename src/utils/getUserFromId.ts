import { Client, User } from 'discord.js';

export async function getUserFromId(client: Client, userId: string): Promise<User | null> {
  try {
    return await client.users.fetch(userId);
  } catch (error) {
    console.error(`❌ Could not fetch user with ID ${userId}:`, error);
    return null;
  }
}