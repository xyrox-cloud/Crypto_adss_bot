module.exports = {
  welcome: (firstName) => `Hello, ${firstName}! 👋\n\nWelcome to AdShare Bot. Here you can complete daily tasks and earn real USDT seamlessly.\nClick below to open the Mini App and start earning!`,
  
  balance: (balance) => `💰 Your current balance is: *${balance.toFixed(2)} USDT*`,
  
  balanceError: () => `❌ Sorry, we couldn't fetch your balance right now. Please try again later.`,
  

  withdrawInsufficient: () => `Your balance is below the minimum withdrawal amount of 2 USDT. Keep completing tasks to earn more!`,
  
  withdrawApp: () => `Please open the AdShare Mini App to process your withdrawal request.`,
  
  registrationError: () => `There was an issue registering your account. Please try again or contact support.`
};
