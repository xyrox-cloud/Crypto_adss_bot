module.exports = {
  welcome: (firstName) => `Hello, ${firstName}! 👋\n\nWelcome to Blitz Game Zone. Here you can play games, complete daily tasks, and earn real TON seamlessly.\nClick below to open the Mini App and start playing!`,
  
  balance: (balance) => `💰 Your current balance is: *${balance.toFixed(4)} TON*`,
  
  balanceError: () => `❌ Sorry, we couldn't fetch your balance right now. Please try again later.`,
  

  withdrawInsufficient: () => `Your balance is below the minimum withdrawal amount of 0.5 TON. Keep completing tasks to earn more!`,
  
  withdrawApp: () => `Please open the Blitz Game Zone Mini App to process your withdrawal request.`,
  
  registrationError: () => `There was an issue registering your account. Please try again or contact support.`
};
