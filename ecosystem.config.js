module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'src/index.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log'
    },
    {
      name: 'bot',
      script: 'src/bot.js',
      cwd: './bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/bot-error.log',
      out_file: '../logs/bot-out.log'
    }
  ]
};
