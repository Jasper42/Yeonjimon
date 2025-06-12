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