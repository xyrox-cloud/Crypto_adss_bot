require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const messages = require('./messages');

const bot = new Telegraf(process.env.BOT_TOKEN);
const BACKEND_URL = process.env.BACKEND_URL;
const MINI_APP_URL = process.env.MINI_APP_URL;

/**
 * Helper function to fetch the user's balance from the backend.
 * Uses the x-telegram-id header for authentication.
 * 
 * @param {number|string} telegram_id The user's Telegram ID
 * @returns {number|null} The user's balance in USDT or null on error
 */
async function fetchUserBalance(telegram_id) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'x-telegram-id': telegram_id.toString(),
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Assuming backend returns { balance: number }
    return data.balance || 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
}

/**
 * Command: /start [referral_code?]
 * Registers the user (and handles optional referral code) and sends the welcome message.
 */
bot.start(async (ctx) => {
  const telegram_id = ctx.from.id;
  const username = ctx.from.username || '';
  const first_name = ctx.from.first_name || 'User';
  
  // Extract referral code from text: "/start REF123" -> "REF123"
  const args = ctx.message.text.split(' ');
  const referral_code = args.length > 1 ? args[1] : null;

  try {
    // Register user with backend
    await fetch(`${BACKEND_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegram_id,
        username,
        first_name,
        referral_code
      })
    });
    
    // Reply with welcome message and inline keyboard
    await ctx.reply(messages.welcome(first_name), {
      ...Markup.inlineKeyboard([
        [
          Markup.button.webApp('🚀 Open AdShare App', MINI_APP_URL),
          Markup.button.callback('💰 Check Balance', 'check_balance')
        ],
        [
          Markup.button.url('📢 Join our channel', 'https://t.me/your_channel')
        ]
      ])
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply(messages.registrationError());
  }
});

/**
 * Command: /balance
 * Fetches and displays the user's current USDT balance.
 */
bot.command('balance', async (ctx) => {
  const telegram_id = ctx.from.id;
  const balance = await fetchUserBalance(telegram_id);
  
  if (balance === null) {
    await ctx.reply(messages.balanceError());
  } else {
    await ctx.reply(messages.balance(balance), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Open AdShare App', MINI_APP_URL)]
      ])
    });
  }
});

/**
 * Command: /help
 * Displays detailed information about the platform.
 */
bot.command('help', async (ctx) => {
  await ctx.reply(messages.help(), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open AdShare App', MINI_APP_URL)]
    ])
  });
});

/**
 * Command: /withdraw
 * Checks balance and prompts user to withdraw via the app if they have enough balance.
 */
bot.command('withdraw', async (ctx) => {
  const telegram_id = ctx.from.id;
  const balance = await fetchUserBalance(telegram_id);
  
  if (balance === null) {
    await ctx.reply(messages.balanceError());
    return;
  }
  
  if (balance < 2) {
    await ctx.reply(messages.withdrawInsufficient(), {
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Open AdShare App', MINI_APP_URL)]
      ])
    });
  } else {
    await ctx.reply(messages.withdrawApp(), {
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('💸 Withdraw Now (App)', MINI_APP_URL)]
      ])
    });
  }
});

/**
 * Action handler for 'check_balance' callback button.
 */
bot.action('check_balance', async (ctx) => {
  // Acknowledge the callback to remove the loading state on the button
  await ctx.answerCbQuery();
  
  const telegram_id = ctx.from.id;
  const balance = await fetchUserBalance(telegram_id);
  
  if (balance === null) {
    await ctx.reply(messages.balanceError());
  } else {
    await ctx.reply(messages.balance(balance), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Open AdShare App', MINI_APP_URL)]
      ])
    });
  }
});

// Launch the bot with graceful shutdown handling
bot.launch().then(() => {
  console.log('Bot is running!');
}).catch((error) => {
  console.error('Failed to launch bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
