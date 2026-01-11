import { Telegraf, Context, Markup } from 'telegraf';
import { config } from '../config';
import prisma from '../db';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class BotService {
  private bot: Telegraf;

  constructor() {
    const telegrafOptions: any = {};
    
    // Configure proxy if specified
    if (config.telegram.proxyUrl) {
      const proxyUrl = config.telegram.proxyUrl;
      let agent;
      
      if (proxyUrl.startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        agent = new HttpsProxyAgent(proxyUrl);
      }
      
      telegrafOptions.telegram = {
        agent: agent
      };
      
      console.log(`Telegram Bot configured to use proxy: ${proxyUrl.replace(/:[^:@]+@/, ':****@')}`);
    } else {
      // Use custom HTTPS agent with IPv4 preference and longer timeout
      // This helps when node-fetch has issues with IPv6 or default timeouts
      const agent = new https.Agent({
        family: 4, // Force IPv4
        keepAlive: true,
        timeout: 30000, // 30 second timeout
      });
      
      telegrafOptions.telegram = {
        agent: agent
      };
    }
    
    this.bot = new Telegraf(config.telegram.botToken, telegrafOptions);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command - handles both welcome and deep links for file sharing
    this.bot.start(async (ctx) => {
      // Try to get payload from different possible locations
      let startPayload = (ctx as any).startPayload || (ctx as any).payload;
      
      // Fallback: extract from message text (e.g., "/start resource_123")
      if (!startPayload && ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;
        if (text.includes(' ')) {
          startPayload = text.split(' ')[1];
        }
      }

      console.log('Bot start command received. Payload:', startPayload);
      
      // Check if this is a deep link to get a specific resource
      if (startPayload && startPayload.startsWith('resource_')) {
        const resourceId = parseInt(startPayload.replace('resource_', ''));
        console.log('Deep link detected for resource ID:', resourceId);
        
        if (!isNaN(resourceId)) {
          await this.sendResourceDirect(ctx, resourceId);
          return;
        }
      }

      await ctx.reply(
        'Welcome to Chenaniah Worship Ministry Bot! 🎵\n\n' +
        'To access your section\'s files, please share your phone number using the button below to link your account.',
        Markup.keyboard([
          Markup.button.contactRequest('📱 Share Phone Number'),
        ]).resize().oneTime()
      );
    });

    // Handle contact sharing
    this.bot.on('contact', async (ctx) => {
      const contact = ctx.message.contact;
      if (!contact || contact.user_id !== ctx.from.id) {
        return ctx.reply('Please share your own contact information.');
      }

      let phone = contact.phone_number;
      // Normalize phone number (remove +, spaces, etc.)
      phone = phone.replace(/\D/g, '');
      // If it starts with 251, it's already normalized for our DB usually, 
      // but let's check how it's stored in the DB.
      
      try {
        // Find student by phone number
        // We might need to try different formats (with/without +251, etc.)
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { phone: phone },
              { phone: `+${phone}` },
              { phone: phone.startsWith('251') ? phone.replace('251', '0') : phone },
              { phone: phone.startsWith('0') ? `251${phone.substring(1)}` : phone },
            ]
          },
          include: { section: true } as any
        });

        if (!student) {
          return ctx.reply('Sorry, we couldn\'t find a student account with this phone number. Please make sure you are registered on the website.');
        }

        // Link Telegram ID to student
        await prisma.student.update({
          where: { id: student.id },
          data: { telegramChatId: BigInt(ctx.from.id) } as any
        });
        
        if (!(student as any).section) {
          return ctx.reply(`Hello ${student.fullNameEnglish || student.username}! You haven't selected a section yet. Please select your section on the website first.`);
        }

        await ctx.reply(
          `Hello ${student.fullNameEnglish || student.username}! You are linked to the ${(student as any).section.name} section.`,
          Markup.removeKeyboard()
        );

        await this.sendSectionFiles(ctx, (student as any).sectionId!);
      } catch (error) {
        console.error('Error linking telegram account:', error);
        await ctx.reply('An error occurred while linking your account. Please try again later.');
      }
    });

    // Help command
    this.bot.help((ctx) => ctx.reply('Send /files to get your section\'s resources.'));

    // Files command
    this.bot.command('files', async (ctx) => {
      // For simplicity, we'll ask them to share contact again if we don't have a session,
      // or we can implement a proper session/database link.
      await ctx.reply('Please share your phone number to verify your section.', 
        Markup.keyboard([
          Markup.button.contactRequest('📱 Share Phone Number'),
        ]).resize().oneTime()
      );
    });
  }

  private async sendSectionFiles(ctx: Context, sectionId: number) {
    try {
      const resources = await prisma.resource.findMany({
        where: {
          OR: [
            { sectionId: null },
            { sectionId: sectionId }
          ]
        } as any,
        orderBy: { createdAt: 'desc' },
        take: 10 // Last 10 resources
      });

      if (resources.length === 0) {
        return ctx.reply('No resources found for your section yet.');
      }

      await ctx.reply('Here are the latest resources for your section:');

      for (const resource of resources) {
        if (resource.type === 'file' && resource.fileUrl) {
          const filename = resource.fileUrl.split('/').pop();
          if (filename) {
            const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);
            if (fs.existsSync(filepath)) {
              await ctx.replyWithDocument({ source: filepath, filename: resource.fileName || filename }, {
                caption: `${resource.title}\n${resource.description || ''}`
              });
            }
          }
        } else if (resource.type === 'link' && resource.url) {
          await ctx.reply(`${resource.title}\n${resource.description || ''}\nLink: ${resource.url}`);
        }
      }
    } catch (error) {
      console.error('Error sending section files:', error);
      await ctx.reply('Error fetching files. Please try again later.');
    }
  }

  public async sendResourceToUser(studentId: number, resourceId: number) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { telegramChatId: true }
      }) as any;

      if (!student || !student.telegramChatId) {
        throw new Error('Student not linked to Telegram');
      }

      const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
      });

      if (!resource) {
        throw new Error('Resource not found');
      }

      const chatId = Number(student.telegramChatId);

      if (resource.type === 'file' && resource.fileUrl) {
        const filename = resource.fileUrl.split('/').pop();
        if (filename) {
          const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);
          if (fs.existsSync(filepath)) {
            await this.bot.telegram.sendDocument(chatId, { source: filepath, filename: resource.fileName || filename }, {
              caption: `${resource.title}\n${resource.description || ''}`
            });
            return true;
          }
        }
      } else if (resource.type === 'link' && resource.url) {
        await this.bot.telegram.sendMessage(chatId, `${resource.title}\n${resource.description || ''}\nLink: ${resource.url}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending resource to user via Telegram:', error);
      throw error;
    }
  }

  // Send resource directly to user who opened a deep link (no account linking required)
  private async sendResourceDirect(ctx: Context, resourceId: number) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
      });

      if (!resource) {
        await ctx.reply('Sorry, this file was not found or has been removed.');
        return;
      }

      await ctx.reply(`📤 Sending: ${resource.title}...`);

      if (resource.type === 'file' && resource.fileUrl) {
        const filename = resource.fileUrl.split('/').pop();
        if (filename) {
          const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);
          if (fs.existsSync(filepath)) {
            await ctx.replyWithDocument(
              { source: filepath, filename: resource.fileName || filename },
              { caption: resource.description || undefined }
            );
            return;
          } else {
            await ctx.reply('Sorry, the file could not be found on the server.');
            return;
          }
        }
      } else if (resource.type === 'link' && resource.url) {
        await ctx.reply(`${resource.title}\n${resource.description || ''}\n\n🔗 ${resource.url}`);
        return;
      }

      await ctx.reply('Sorry, this file type is not supported.');
    } catch (error) {
      console.error('Error sending resource via deep link:', error);
      await ctx.reply('Sorry, there was an error sending this file. Please try again later.');
    }
  }

  public async start() {
    if (!config.telegram.botToken) {
      console.warn('Telegram Bot Token not provided. Bot will not start.');
      return;
    }
    
    try {
      // Test connection first with a simple getMe call
      console.log('Testing Telegram API connection...');
      const me = await this.bot.telegram.getMe();
      console.log(`Telegram Bot connected: @${me.username}`);
      
      await this.bot.launch();
      console.log('Telegram Bot started successfully (polling mode)');
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.error('Failed to connect to Telegram API. Possible causes:');
        console.error('  - Network/firewall blocking Telegram');
        console.error('  - Set TELEGRAM_PROXY_URL in .env to use a proxy');
        console.error('  - Example: TELEGRAM_PROXY_URL=socks5://127.0.0.1:1080');
      } else if (error.response?.error_code === 401) {
        console.error('Telegram Bot Token is invalid. Please check TELEGRAM_BOT_TOKEN in .env');
      } else {
        console.error('Failed to start Telegram Bot:', error.message || error);
      }
      // Don't crash the server, just log the error
      console.warn('Server will continue without Telegram bot functionality.');
    }
  }

  public stop() {
    this.bot.stop();
  }
}

export const botService = new BotService();
