import { Client } from 'unb-api';
import config from '../config';

const unb = new Client(config.Unbelievaboat_key);

export async function awardCurrency(userId: string, amount: number): Promise<any> {
  try {
    const result = await unb.editUserBalance(config.GUILD_ID, userId, { cash: amount });
    console.log(`💰 Awarded ${amount} to ${userId}`);
    return result;
  } catch (error: unknown) {
    if ((error as any)?.response?.status === 404) {
      console.error('❌ User not found in UnbelievaBoat. Make sure they ran /balance or used the bot.');
    } else {
      console.error('❌ Failed to award currency:', error);
    }
  }
}

export async function subtractCurrency(userId: string, amount: number): Promise<any> {
  try {
    const result = await unb.editUserBalance(config.GUILD_ID, userId, { cash: -amount });
    console.log(`💰 Subtracted ${amount} from ${userId}`);
    return result;
  } catch (error: unknown) {
    if ((error as any)?.response?.status === 404) {
      console.error('❌ User not found in UnbelievaBoat. Make sure they ran /balance or used the bot.');
    } else {
      console.error('❌ Failed to subtract currency:', error);
    }
  }
}

export async function getServerBalance(): Promise<number | null> {
  try {
    const guild = await unb.getGuild(config.GUILD_ID);
    // Log the guild object to inspect its properties and find the correct balance property
    console.log('Guild object:', guild);
    // Replace 'totalCash' with the correct property name for the server balance if different
    return (guild as any).totalCash ?? null;
  } catch (error: unknown) {
    console.error('❌ Failed to fetch server balance:', error);
    return null;
  }
}

export async function getUserBalance(userId: string): Promise<number | null> {
  try {
    const user = await unb.getUserBalance(config.GUILD_ID, userId);
    // The Unbelievaboat API returns a 'cash' property for the user's balance
    return user.cash ?? null;
  } catch (error: unknown) {
    console.error('❌ Failed to fetch user balance:', error);
    return null;
  }
}