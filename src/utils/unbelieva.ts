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

// Returns the user's total balance (cash + bank)
export async function getUserTotalBalance(userId: string): Promise<number | null> {
  try {
    const user = await unb.getUserBalance(config.GUILD_ID, userId);
    // Prefer the 'total' property if available, fallback to cash+bank
    if (typeof user.total === 'number') return user.total;
    if (user.cash == null && user.bank == null) return null;
    return (user.cash ?? 0) + (user.bank ?? 0);
  } catch (error: unknown) {
    console.error('❌ Failed to fetch user total balance:', error);
    return null;
  }
}

// Check if user has a specific item in their inventory
export async function userHasItem(userId: string, itemName: string): Promise<boolean> {
  try {
    const inventoryResponse = await unb.getInventoryItems(config.GUILD_ID, userId);
    // Use regex to match item names ending with the target name (case-insensitive)
    // This handles cases like "🎫 Silver Ticket" or ":ticket: Silver Ticket"
    const regex = new RegExp(`${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    return inventoryResponse.items.some((item: any) => regex.test(item.name));
  } catch (error: unknown) {
    if ((error as any)?.response?.status === 404) {
      console.error('❌ User not found in UnbelievaBoat. Make sure they ran /balance or used the bot.');
    } else {
      console.error('❌ Failed to check user inventory:', error);
    }
    return false;
  }
}

// Get all user inventory items (useful for debugging)
export async function getUserInventory(userId: string): Promise<any[]> {
  try {
    const inventoryResponse = await unb.getInventoryItems(config.GUILD_ID, userId);
    return inventoryResponse.items;
  } catch (error: unknown) {
    if ((error as any)?.response?.status === 404) {
      console.error('❌ User not found in UnbelievaBoat. Make sure they ran /balance or used the bot.');
    } else {
      console.error('❌ Failed to get user inventory:', error);
    }
    return [];
  }
}

// Remove an item from user's inventory
export async function removeInventoryItem(userId: string, itemName: string, quantity: number = 1): Promise<boolean> {
  try {
    // First get the user's inventory to find the specific item
    const inventoryResponse = await unb.getInventoryItems(config.GUILD_ID, userId);
    // Use regex to match item names ending with the target name (case-insensitive)
    const regex = new RegExp(`${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const item = inventoryResponse.items.find((item: any) => regex.test(item.name));
    
    if (!item) {
      console.error(`❌ Item ending with "${itemName}" not found in user's inventory`);
      return false;
    }
    
    // Remove the item from inventory
    await unb.removeInventoryItem(config.GUILD_ID, userId, item.itemId, quantity);
    console.log(`🎫 Removed ${quantity}x "${item.name}" from ${userId}'s inventory`);
    return true;
  } catch (error: unknown) {
    if ((error as any)?.response?.status === 404) {
      console.error('❌ User not found in UnbelievaBoat. Make sure they ran /balance or used the bot.');
    } else {
      console.error('❌ Failed to remove item from inventory:', error);
    }
    return false;
  }
}