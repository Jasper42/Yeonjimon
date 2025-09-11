import { Client, TextChannel } from 'discord.js';
import { adminCountPollinationsCommand } from '../commands/adminCountPollinationsCommand';
import config from '../config';
import { isDev } from './botConstants';
import * as fs from 'fs';
import * as path from 'path';

const SCAN_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const STARTUP_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds
const LAST_SCAN_FILE = path.join(__dirname, '../../last-pollination-scan.txt');

let scanInterval: NodeJS.Timeout | null = null;

// Helper functions for cooldown management
function getLastScanTime(): number {
  try {
    if (fs.existsSync(LAST_SCAN_FILE)) {
      const timestamp = fs.readFileSync(LAST_SCAN_FILE, 'utf8').trim();
      return parseInt(timestamp) || 0;
    }
  } catch (error) {
    console.log('Could not read last scan file:', error);
  }
  return 0;
}

function setLastScanTime(timestamp: number): void {
  try {
    fs.writeFileSync(LAST_SCAN_FILE, timestamp.toString());
  } catch (error) {
    console.log('Could not write last scan file:', error);
  }
}

function canRunStartupScan(): boolean {
  const lastScan = getLastScanTime();
  const now = Date.now();
  const timeSinceLastScan = now - lastScan;
  
  if (timeSinceLastScan < STARTUP_COOLDOWN) {
    const remainingCooldown = STARTUP_COOLDOWN - timeSinceLastScan;
    const remainingMinutes = Math.ceil(remainingCooldown / (60 * 1000));
    console.log(`⏳ Startup scan on cooldown. ${remainingMinutes} minutes remaining.`);
    return false;
  }
  
  return true;
}

export class PollinationScheduler {
  private client: Client;
  private scanChannel: TextChannel | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  async initialize() {
    try {
      // In development/testing environment, don't initialize scheduler if channel doesn't exist
      if (isDev) {
        console.log('🧪 Development environment detected - checking for pollination scan channel...');
      }

      // Get the designated scan channel
      const channel = await this.client.channels.fetch(config.POLLINATION_SCAN_CHANNEL_ID).catch(() => null);
      
      if (!channel) {
        if (isDev) {
          console.log('⚠️ Pollination scan channel not found in testing environment - scheduler disabled');
          return;
        } else {
          console.error('❌ Pollination scan channel not found in production environment');
          return;
        }
      }

      if (channel?.isTextBased() && 'name' in channel) {
        this.scanChannel = channel as TextChannel;
        console.log(`📅 Pollination scheduler initialized for channel: ${channel.name}`);
      } else {
        if (isDev) {
          console.log('⚠️ Pollination scan channel is not a text channel in testing environment - scheduler disabled');
          return;
        } else {
          console.error('❌ Pollination scan channel is not a text channel');
          return;
        }
      }

      // Run initial scan on startup (only if not in dev mode and cooldown has passed)
      if (!isDev) {
        if (canRunStartupScan()) {
          console.log('🚀 Running initial pollination scan on bot startup...');
          await this.runScheduledScan('Bot startup');
        } else {
          console.log('⏳ Skipping startup scan due to cooldown period');
        }
      } else {
        console.log('🧪 Development mode - skipping initial scan. Use manual trigger if needed.');
      }

      // Schedule daily scans
      this.startDailySchedule();

    } catch (error) {
      if (isDev) {
        console.log('⚠️ Pollination scheduler initialization failed in testing environment - this is normal');
        console.log('   Use the manual trigger command if you need to test scanning functionality');
      } else {
        console.error('❌ Failed to initialize pollination scheduler:', error);
      }
    }
  }

  private startDailySchedule() {
    if (scanInterval) {
      clearInterval(scanInterval);
    }

    scanInterval = setInterval(async () => {
      await this.runScheduledScan('Daily scheduled scan');
    }, SCAN_INTERVAL);

    console.log('⏰ Daily pollination scan scheduled (every 24 hours)');
  }

  private async runScheduledScan(reason: string) {
    if (!this.scanChannel) {
      console.error('❌ No scan channel available for scheduled pollination scan');
      return;
    }

    try {
      console.log(`🔍 Starting scheduled pollination scan: ${reason}`);
      
      // Send a notification message to the channel
      const startMessage = await this.scanChannel.send({
        content: `🤖 **Automated Pollination Scan**\n📅 **Trigger:** ${reason}\n⏰ **Started:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n⏳ Initializing scan...`
      });

      // Create a mock interaction object for the admin command
      const mockInteraction = {
        reply: async (options: any) => {
          await startMessage.edit({
            content: `🤖 **Automated Pollination Scan**\n📅 **Trigger:** ${reason}\n⏰ **Started:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n${options.content}`
          });
        },
        followUp: async (options: any) => {
          if (options.content.includes('✅ Scan complete!')) {
            // Final success message - create a new message
            await this.scanChannel!.send({
              content: `✅ **Pollination Scan Complete**\n${options.content}\n⏰ **Finished:** <t:${Math.floor(Date.now() / 1000)}:f>`
            });
          } else {
            // Progress updates - edit the existing message
            await startMessage.edit({
              content: `🤖 **Automated Pollination Scan**\n📅 **Trigger:** ${reason}\n⏰ **Started:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n${options.content}`
            });
          }
        },
        options: {
          getString: () => null,
          get: () => null
        },
        user: {
          id: config.ADMIN_USER_IDS[0] || 'scheduler-bot', // Use first admin ID for permission
          username: 'Scheduler'
        },
        guild: this.scanChannel!.guild, // Add guild property so command can access channels
        guildId: config.GUILD_ID
      };

      // Execute the pollination counting command
      await adminCountPollinationsCommand.execute({
        interaction: mockInteraction as any,
        client: this.client,
        userId: config.ADMIN_USER_IDS[0] || 'scheduler-bot' // Use first admin ID for permission
      });

      console.log(`✅ Scheduled pollination scan completed: ${reason}`);
      
      // Record the scan time for cooldown tracking
      setLastScanTime(Date.now());

    } catch (error) {
      console.error(`❌ Error during scheduled pollination scan:`, error);
      
      if (this.scanChannel) {
        await this.scanChannel.send({
          content: `❌ **Pollination Scan Failed**\n📅 **Trigger:** ${reason}\n⏰ **Failed:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  }

  public async triggerManualScan() {
    await this.runScheduledScan('Manual trigger');
  }

  public stop() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
      console.log('⏹️ Pollination scheduler stopped');
    }
  }
}

export let pollinationScheduler: PollinationScheduler | null = null;

export function initializePollinationScheduler(client: Client) {
  pollinationScheduler = new PollinationScheduler(client);
  return pollinationScheduler;
}
