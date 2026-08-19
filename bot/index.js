/**
 * Entry point wrapper for Heaven Cloud / Pterodactyl panel.
 * Loads environment variables and executes src/bot.js.
 */
require('dotenv').config();
require('./src/bot');
