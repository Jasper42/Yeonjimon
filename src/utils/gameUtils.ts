import { Client, User } from 'discord.js';

export interface GameSession {
  target: string;
  limit: number;
  groupname?: string;
  active: boolean;
  players: Record<string, number>;
  correctGuessers: Set<string>; // Track users who guessed correctly
  groupGuesser?: { userId: string; username: string }; // Track who guessed the group name
  starterId: string;
  starterName: string;
  imageUrl?: string;
  noHints?: boolean; // Disable helpful hints, AI will be cheeky instead
}

export async function getUserFromId(client: Client, userId: string): Promise<User | null> {
  try {
    return await client.users.fetch(userId);
  } catch (error) {
    console.error(`❌ Could not fetch user with ID ${userId}:`, error);
    return null;
  }
}