/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-08-18 16:37:51
 * @Description:
 */
const TelegramBot = require('node-telegram-bot-api');

const { tokenSecurity } = require('./tokenSecurity.js');
const { addressSecurity } = require('./addressSecurity.js');
const { erc20ApprovalSecurity } = require('./erc20ApprovalSecurity.js');
const { processUserStrategies } = require('./UserTradingStrategy.js');
const { abi: ERC20ABI } = require('../build/ERC20.json');
const { ethers } = require('ethers');
const {
  isValidPrivateKey,
  isValidAddress,
  getBalance,
  getWallet,
  getTokenBalance,
  uploadInviteUsers,
  findInviteInfo,
  keyboard,
  getETHPrice,
  getToken,
  menu,
  menuWallet,
  getwethDeposit,
  connectMongodb,
  getApprove,
  connectClient,
  closeClient,
  getTokenPriceV2,
  executeRouteV2,
  executeStrategyV2,
  fromReadableAmount,
  getEstimate,
} = require('./helper.js');
require('dotenv').config();

// telegram bot
const token = process.env.TOKEN_RESPECT;

const bot = new TelegramBot(token, { polling: true });

//private keys
//chatId=>[privateKey]
let privateKeys = {};
//chatId=>address=>privateKey
let privateKeysforAddress = {};
//chatId=>adminAddress=>contractAddress=>{}
let contract = {};
//chatId=>adminAddress=>contractAddress=>strategy
let selectedOptions = {};
//chatId=>selected
let strategySeletcted = {};
//chatId=>address have strategy
let chatIdforAddress = {};
let WETH;
const network = process.env.NETWORK;
if (network === 'MUMBAI') {
  WETH = process.env.MUMBAI_WETH;
} else if (network === 'GOERLI') {
  WETH = process.env.GOERLI_WETH;
} else if (network === 'MAINNET') {
  WETH = process.env.MAINNET_WETH;
} else if (network === 'Shibarium') {
  WETH = process.env.WBONE;
}
const WETH_decimails = 18;

const buttons = {
  inline_keyboard: keyboard,
};
//轮询策略

processUserStrategies(bot, selectedOptions, privateKeysforAddress);

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const inviteMessage = msg.text.split(' ');
  bot.sendMessage(
    chatId,
    `Welcome to the Meme Bot! 😄\n🤖Customize your meme trades with our bot! \n🚀Whether it's a bullish run or a bearish slide📉\n<b>💥You'll catch it!</b> \n🤔️No need to constantly watch the market's ups and downs. \n💼Let us handle it for you!\n\nJust follow me:\nStep 1: click Import Wallet or Generate Wallet\nStep 2: choose a Wallet to operate\n`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: menu,
      },
    }
  );
  if (inviteMessage.length > 1) {
    try {
      const inviteUsers = await findInviteInfo(chatId, 'InviteUsers');
      if (inviteUsers === null) {
        await uploadInviteUsers(chatId, inviteMessage[1], false);
      }
    } catch (e) {
      console.log(e);
    }
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const buttonPressed = query.data;
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }
  const order = privateKeys[chatId].order;
  strategySeletcted[chatId] ??= {};
  strategySeletcted[chatId].selected ??= [];
  let adminAddress, privateKey;

  if (order) {
    privateKey = privateKeys[chatId][order];
    wallet = new ethers.Wallet(privateKey);
    adminAddress = wallet.address;
  }

  const selected = strategySeletcted[chatId].selected;
  switch (buttonPressed) {
    case '/wallet1':
      // The user clicked the button, trigger the /check logic
      setWallet1(chatId);
      break;
    case '/wallet2':
      // The user clicked the button, trigger the /check logic
      setWallet2(chatId);
      break;
    case '/wallet3':
      // The user clicked the button, trigger the /check logic
      setWallet3(chatId);
      break;
    case '/privatekey':
      // The user clicked the button, trigger the /privatekey logic

      privatekey(chatId);

      break;
    case '/check':
      // The user clicked the button, trigger the /check logic
      check(chatId);
      break;
    case '/sendeth':
      // The user clicked the button, trigger the /sendeth logic
      sendETH(chatId, privateKey);
      break;
    case 'buynow':
      // The user clicked the button, trigger the /check logic
      buyNow(chatId, privateKey, adminAddress);
      break;
    case 'sellnow':
      // The user clicked the button, trigger the /sendeth logic
      sellNow(chatId, privateKey, adminAddress);
      break;
    case 'Estimate':
      getEstimateCommand(chatId, adminAddress);
      break;
    case '/generatewallet':
      // The user clicked the button, trigger the /generatewallet logic
      generateWallet(chatId);
      break;
    case '/tokensecurity':
      // The user clicked the button, trigger the /tokensecurity logic

      tokenSecurityCommand(chatId);

      break;
    case '/addresssecurity':
      // The user clicked the button, trigger the /addresssecurity logic
      addressSecurityCommand(chatId);
      break;

    case '/strategy':
      // The user clicked the button, trigger the /strategy logic

      strategyCommand(chatId, adminAddress);

      break;
    case 'Double':
      // The user clicked the button, trigger the /strategy logic
      if (!contract[chatId]?.[adminAddress]?.contractAddress) {
        bot
          .sendMessage(
            chatId,
            'Please set the contract address by clicking on SetContract'
          )
          .then((sentMessage) => {
            setTimeout(() => {
              bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
            }, 5000);
          });
        break;
      }
      setDoubleSell(chatId, adminAddress);
      const textDouble = tradeText(chatId, adminAddress);
      bot.editMessageText(textDouble, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: messageId,
        reply_markup: buttons,
      });

      break;
    case 'Half':
      // The user clicked the button, trigger the /strategy logic
      if (!contract[chatId][adminAddress].contractAddress) {
        bot
          .sendMessage(
            chatId,
            'Please set the contract address by clicking on SetContract'
          )
          .then((sentMessage) => {
            setTimeout(() => {
              bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
            }, 5000);
          });
        break;
      }
      setHalfSell(chatId, adminAddress);
      const textHalf = tradeText(chatId, adminAddress);
      bot.editMessageText(textHalf, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: messageId,
        reply_markup: buttons,
      });

      break;
    case 'AB':
      if (!contract[chatId][adminAddress].contractAddress) {
        bot
          .sendMessage(
            chatId,
            'Please set the contract address by clicking on SetContract'
          )
          .then((sentMessage) => {
            setTimeout(() => {
              bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
            }, 5000);
          });
        break;
      }
      // The user clicked the button, trigger the /strategy logic
      await setDoubleSell(chatId, adminAddress);
      await setHalfSell(chatId, adminAddress);
      const text = tradeText(chatId, adminAddress);
      bot.editMessageText(text, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: messageId,
        reply_markup: buttons,
      });
      break;

    case 'Contract':
      await setContractCommand(chatId, messageId, adminAddress);

      break;
    case 'Clear':
      setClearCommand(chatId, messageId, adminAddress);

      break;
    case 'Revoke':
      setRevokeCommand(chatId, adminAddress);

      break;
    case 'RevokeAll':
      await setRevokeAllCommand(chatId, adminAddress);

      break;
    case 'Check':
      setCheckCommand(chatId, adminAddress);

      break;
    case 'Slippage':
      setSlippage(chatId, messageId, adminAddress);

      break;
    case 'Update':
      setUpdateCommand(chatId, messageId, adminAddress);

      break;
    case '/Referral':
      bot.sendMessage(
        chatId,
        `🔗Referral Link:\nhttps://t.me/respect_meme_bot?start=${chatId}`
      );

      break;
  }
  const pattern = /^(\d+)%$/;

  if (
    selected.length === 0 &&
    (buttonPressed === 'up' || buttonPressed === 'down')
  ) {
    strategySeletcted[chatId].selected.push(buttonPressed);

    bot
      .sendMessage(chatId, `Generated Strategy:${buttonPressed}`)
      .then((sentMessage) => {
        strategySeletcted[chatId].messageId = sentMessage.message_id;
      });
  } else if (selected.length === 1 && pattern.test(buttonPressed)) {
    strategySeletcted[chatId].selected.push(buttonPressed);
    const messageStrategy = strategySeletcted[chatId].selected.join(' ');
    if (strategySeletcted[chatId].messageId) {
      await bot.editMessageText(`Generated Strategy:${messageStrategy}`, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: strategySeletcted[chatId].messageId,
      });
    }
  } else if (
    selected.length === 2 &&
    (buttonPressed === 'buy' || buttonPressed === 'sell')
  ) {
    strategySeletcted[chatId].selected.push(buttonPressed);
    const messageStrategy = strategySeletcted[chatId].selected.join(' ');
    if (strategySeletcted[chatId].messageId)
      await bot.editMessageText(`Generated Strategy:${messageStrategy}`, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: strategySeletcted[chatId].messageId,
      });
  } else if (selected.length === 3 && pattern.test(buttonPressed)) {
    //实时输出策略
    strategySeletcted[chatId].selected.push(buttonPressed);
    const messageStrategy = strategySeletcted[chatId].selected.join(' ');
    if (strategySeletcted[chatId].messageId) {
      await bot.editMessageText(`Generated Strategy:${messageStrategy}`, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: strategySeletcted[chatId].messageId,
      });
    }

    if (
      (strategySeletcted[chatId].selected[2] === 'buy' &&
        Number(contract[chatId][adminAddress].ethBalance) === 0) ||
      (strategySeletcted[chatId].selected[2] === 'sell' &&
        Number(contract[chatId][adminAddress].tokenBalance) === 0)
    ) {
      strategySeletcted[chatId].selected = [];

      await bot.deleteMessage(chatId, strategySeletcted[chatId].messageId);

      bot
        .sendMessage(chatId, 'Cannot set this strategy with a balance of zero')
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
          }, 5000);
        });
      return;
    }

    const condition =
      strategySeletcted[chatId].selected[0] +
      ' ' +
      strategySeletcted[chatId].selected[1];
    const action =
      strategySeletcted[chatId].selected[2] +
      ' ' +
      strategySeletcted[chatId].selected[3];

    const strategy = {
      condition: condition,
      action: action,
      origin: contract[chatId][adminAddress].currentPrice,
      balance:
        strategySeletcted[chatId].selected[2] === 'buy'
          ? contract[chatId][adminAddress].ethBase
          : contract[chatId][adminAddress].tokenBalance,
      slippage: contract[chatId][adminAddress].slippage || '5%',
    };

    contract[chatId][adminAddress].ethChange ??= 0;

    if (strategySeletcted[chatId].selected[2] === 'buy') {
      contract[chatId][adminAddress].ethChange +=
        (parseInt(strategySeletcted[chatId].selected[3], 10) / 100) *
        contract[chatId][adminAddress].ethBase;
      console.log('ethChange: ' + contract[chatId][adminAddress].ethChange);
    }

    contract[chatId][adminAddress].strategy ??= [];
    if (contract[chatId][adminAddress].strategy.length === 3) {
      contract[chatId][adminAddress].strategy = [];
      bot
        .sendMessage(chatId, 'You can set up to three strategies at most.')
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
          }, 5000);
        });
    }
    contract[chatId][adminAddress].strategy.push(strategy);

    strategySeletcted[chatId].selected = [];

    const text = tradeText(chatId, adminAddress);

    bot.editMessageText(text, {
      parse_mode: 'HTML',
      chat_id: chatId,
      message_id: messageId,
      reply_markup: buttons,
    });

    await bot.deleteMessage(chatId, strategySeletcted[chatId].messageId);

    strategySeletcted[chatId].messageId = null;
  } else if (buttonPressed === 'finish') {
    // 用户点击 "Finish" 按钮，返回用户选择的所有选项数组
    // selectedOptions.pop();
    bot.sendMessage(chatId, 'Submitting strategies...').then((sentMessage) => {
      setTimeout(() => {
        bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
      }, 5000);
    });
    if (!contract[chatId]?.[adminAddress]?.contractAddress) {
      bot
        .sendMessage(
          chatId,
          'Please set the contract address and click "Trade" to reset.'
        )
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
          }, 5000);
        });
      return;
    }
    chatIdforAddress[chatId] ??= [];
    const containsAdminAddress =
      chatIdforAddress[chatId].includes(adminAddress);
    if (!containsAdminAddress) {
      if (chatIdforAddress[chatId]?.length < 3) {
        chatIdforAddress[chatId].push(adminAddress);
      } else if (chatIdforAddress[chatId]?.length === 3) {
        bot
          .sendMessage(
            chatId,
            'You can set strategies for up to three addresses at most.'
          )
          .then((sentMessage) => {
            setTimeout(() => {
              bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
            }, 5000);
          });
        return;
      }
    }

    ////////////////////////////////////////////////////////////////
    const chatIdforadminAddress = chatId + '-' + adminAddress;
    const contractAddress = contract[chatId][adminAddress].contractAddress;
    selectedOptions[chatIdforadminAddress] ??= {};
    const contracts = Object.keys(selectedOptions[chatIdforadminAddress]);

    if (!contract[chatId]?.[adminAddress]?.strategy?.length) {
      // Strategy is an empty array or undefined
      return;
    }
    const strategy = contract[chatId][adminAddress]?.strategy;

    // const privateKey = contract[chatId][adminAddress].privateKey;
    const ethChange = Number(contract[chatId][adminAddress].ethChange);
    const wethBalance = Number(contract[chatId][adminAddress].wethBalance);

    const costETH = Number(strategy.length * 0.01);

    const ethBalance = Number(contract[chatId][adminAddress].ethBalance);
    console.log(
      `wethBalance:${wethBalance} ethChange:${ethChange} ethBalance:${ethBalance} ethCost:${costETH}`
    );

    ////检测余额够不够
    if (ethChange > 0) {
      await getApprove(WETH, privateKey);
    }
    if (wethBalance >= ethChange && ethBalance > costETH) {
      bot.sendMessage(chatId, `WETH Balance: ${wethBalance}`);
    } else if (
      ethChange > 0 &&
      wethBalance < ethChange &&
      ethBalance + wethBalance > ethChange + costETH
    ) {
      const depositETH = (ethChange - wethBalance).toFixed(7);

      await getwethDeposit(depositETH, privateKey);
      bot.sendMessage(
        chatId,
        `Converting ${depositETH} ETH to ${depositETH} WETH trade.`
      );
    } else if (
      ethChange > 0 &&
      ethBalance + wethBalance <= ethChange + costETH
    ) {
      bot.sendMessage(
        chatId,
        'Insufficient ETH balance for WETH exchange. Please deposit and try the trade again.'
      );

      contract[chatId][adminAddress].strategy = [];
      contract[chatId][adminAddress].ethChange = 0;
      contract[chatId][adminAddress].doubleBool = false;
      contract[chatId][adminAddress].HalfBool = false;
      contract[chatId][adminAddress].slippage = '';
      return;
    }

    // selectedOptions[chatId][adminAddress] ??= {};

    selectedOptions[chatIdforadminAddress][contractAddress] ??= {};
    selectedOptions[chatIdforadminAddress][contractAddress].strategy = strategy;
    selectedOptions[chatIdforadminAddress][contractAddress].change = true;
    const strategyText = strategy
      .map(
        (item, index) =>
          `\n🚀<b>Trading Strategy</b> ${index + 1}:\n    ${item.condition}  ${
            item.action
          }\n    Initial Price: ${item.origin} Base: ${item.balance}`
      )
      .join('');

    bot.sendMessage(
      chatId,
      `🔍 You have customized strategies for the token contract!!\n\n  ${contract[chatId][adminAddress].contractAddress}\n${strategyText}`,
      { parse_mode: 'HTML' }
    );

    await getApprove(contractAddress, privateKey);
    await connectMongodb(selectedOptions);
    contract[chatId][adminAddress].strategy = [];
    contract[chatId][adminAddress].ethChange = 0;
    contract[chatId][adminAddress].doubleBool = false;
    contract[chatId][adminAddress].HalfBool = false;
    contract[chatId][adminAddress].slippage = '';

    // } else {
    //   bot.sendMessage(chatId, '请按正确的顺序选择');
  }
});

async function getEstimateCommand(chatId, adminAddress) {
  const tokenAddress = contract[chatId]?.[adminAddress]?.contractAddress;

  let honeypotText;
  try {
    const results = await getEstimate(tokenAddress);
    honeypotText = `
    🍯 \`Is Honypot: ${
      results?.honeypotResult ? results.honeypotResult.isHoneypot : 'Unknown'
    }\`
📈 \`Buy Recommend Slippage: ${
      results?.simulationResult
        ? results.simulationResult.buyTax == 0
          ? '0.5'
          : Number(results.simulationResult.buyTax.toFixed(2)) + 0.5
        : 'Unknown'
    }%\`
📉 \`Sell Recommend Slippage: ${
      results?.simulationResult
        ? results.simulationResult.sellTax == 0
          ? '0.5'
          : Number(results.simulationResult.sellTax.toFixed(2)) + 0.5
        : 'Unknown'
    }%\`
          `;
  } catch (err) {
    honeypotText = `\`The contract is not open source\``;
  }
  bot.sendMessage(chatId, honeypotText, { parse_mode: 'Markdown' });
}

async function buyNow(chatId, privateKey, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    'Please enter the amount of ETH to be traded, e.g.: 0.1'
  );

  bot.once('message', async (msg) => {
    const amount = msg.text;
    const regex = /^\d+(\.\d+)?/;
    if (regex.test(amount) && Number(amount) > 0) {
      const actionMessage = await bot.sendMessage(
        chatId,
        'Executing transaction...'
      );

      const amountIn = Number(amount);

      const wethBalance = Number(contract[chatId][adminAddress].wethBalance);

      const costETH = 0.01;

      const ethBalance = Number(contract[chatId][adminAddress].ethBalance);

      await getApprove(WETH, privateKey);

      if (wethBalance >= amountIn && ethBalance > costETH) {
        bot.sendMessage(chatId, `WETH Balance: ${wethBalance}`);
      } else if (
        wethBalance < amountIn &&
        ethBalance + wethBalance > amountIn + costETH
      ) {
        const depositETH = (amountIn - wethBalance).toFixed(7);

        await getwethDeposit(depositETH, privateKey);
        bot.sendMessage(
          chatId,
          `Converting ${depositETH} ETH to ${depositETH} WETH trade.`
        );
      } else if (ethBalance + wethBalance <= amountIn + costETH) {
        bot.sendMessage(
          chatId,
          'Insufficient ETH balance for WETH exchange. Please deposit and try the trade again.'
        );
        return;
      }
      let slippage = contract[chatId]?.[adminAddress]?.slippage || '5%';
      slippage = parseFloat(slippage) / 100;
      const contractAddress = contract[chatId][adminAddress].contractAddress;
      const AmountInBig = fromReadableAmount(amountIn, WETH_decimails);
      const wallet = await getWallet(privateKey);
      let hash;
      try {
        const tx = await executeRouteV2(
          WETH,
          contractAddress,
          AmountInBig,
          adminAddress,
          wallet,
          slippage
        );
        hash = tx.hash;
      } catch (error) {
        console.log(error);
        bot.sendMessage(
          chatId,
          '`The gas or slippage settings are insufficient to fulfill this order...`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const beforeWETHBalance = contract[chatId][adminAddress].wethBalance;
      const beforeTokenBalance = contract[chatId][adminAddress].tokenBalance;
      const afterTokenBalance = await getTokenBalance(
        contractAddress,
        adminAddress
      );
      const afterWETHBalance = await getTokenBalance(WETH, adminAddress);
      bot.sendMessage(
        chatId,
        `👛 <b>Wallet Address</b>
      ${adminAddress}\n✉️ <b>Contract Address</b>
      ${contractAddress}\n🌈<b>Transaction Hash:</b>\n${hash}\n\n💰 <b>Before Transaction:</b>
      WETH Balance: ${beforeWETHBalance}
      Token Balance: ${beforeTokenBalance}\n💰 <b>After Transaction:</b>
      WETH Balance: ${afterWETHBalance}
      Token Balance: ${afterTokenBalance}`,
        { parse_mode: 'HTML' }
      );
      bot.deleteMessage(chatId, actionMessage.message_id);
    } else {
      bot
        .sendMessage(
          chatId,
          'The input format is incorrect.Please click buyNow again'
        )
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
          }, 5000);
        });
    }

    bot.deleteMessage(chatId, initialMessage.message_id);
  });
}
async function sellNow(chatId, privateKey, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    'Please enter the amount of token to be traded, e.g.: 10000'
  );

  bot.once('message', async (msg) => {
    const amount = msg.text;
    const regex = /^\d+(\.\d+)?/;
    if (regex.test(amount)) {
      const actionMessage = await bot.sendMessage(
        chatId,
        'Executing transaction...'
      );

      const amountIn = Number(amount);
      const beforeTokenBalance = Number(
        contract[chatId][adminAddress].tokenBalance
      );
      let slippage = contract[chatId]?.[adminAddress]?.slippage || '5%';
      slippage = parseFloat(slippage) / 100;
      if (amountIn > beforeTokenBalance) {
        bot.sendMessage(chatId, 'Token balance is not enough to trade.');
        return;
      }
      const contractAddress = contract[chatId][adminAddress].contractAddress;
      await getApprove(contractAddress, privateKey);

      const decimals = await getToken(contractAddress);
      const AmountInBig = fromReadableAmount(amountIn, decimals);
      const wallet = await getWallet(privateKey);
      let hash;
      try {
        const tx = await executeRouteV2(
          contractAddress,
          WETH,
          AmountInBig,
          adminAddress,
          wallet,
          slippage
        );
        hash = tx.hash;
      } catch (error) {
        console.log(error);
        bot.sendMessage(
          chatId,
          '`The gas or slippage settings are insufficient to fulfill this order...`',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      const beforeWETHBalance = contract[chatId][adminAddress].wethBalance;

      const afterTokenBalance = await getTokenBalance(
        contractAddress,
        adminAddress
      );
      const afterWETHBalance = await getTokenBalance(WETH, adminAddress);
      bot.sendMessage(
        chatId,
        `👛 <b>Wallet Address</b>
    ${adminAddress}\n✉️ <b>Contract Address</b>
    ${contractAddress}\n🌈<b>Transaction Hash:</b>\n${hash}\n\n💰 <b>Before Transaction:</b>
    WETH Balance: ${beforeWETHBalance}
    Token Balance: ${beforeTokenBalance}\n💰 <b>After Transaction:</b>
    WETH Balance: ${afterWETHBalance}
    Token Balance: ${afterTokenBalance}`,
        { parse_mode: 'HTML' }
      );
      bot.deleteMessage(chatId, actionMessage.message_id);
    } else {
      bot
        .sendMessage(
          chatId,
          'The input format is incorrect.Please click sellNow again'
        )
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
          }, 5000);
        });
    }

    bot.deleteMessage(chatId, initialMessage.message_id);
  });
}

async function setUpdateCommand(chatId, messageId, adminAddress) {
  let initialMessage;
  const contractAddress = contract[chatId][adminAddress].contractAddress;
  if (contractAddress) {
    initialMessage = await bot.sendMessage(
      chatId,
      'Please wait for the price update...'
    );
    const tokenBalance = await getTokenBalance(contractAddress, adminAddress);
    const decimals = await getToken(contractAddress);

    const currentPrice = await getTokenPriceV2(contractAddress, decimals);
    contract[chatId][adminAddress].tokenBalance = tokenBalance;
    const ethPrice = await getETHPrice();
    contract[chatId][adminAddress].currentPrice = currentPrice
      ? ethPrice * currentPrice
      : '';
  } else {
    bot
      .sendMessage(
        chatId,
        'Please set the contract address by clicking on SetContract'
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
        }, 5000);
      });
  }

  const ethBalance = await getBalance(adminAddress);
  const wethBalance = await getTokenBalance(WETH, adminAddress);
  contract[chatId][adminAddress].ethBalance = ethBalance;
  contract[chatId][adminAddress].wethBalance = wethBalance;
  contract[chatId][adminAddress].ethBase = (
    Number(ethBalance) + Number(wethBalance)
  ).toFixed(4);

  const text = tradeText(chatId, adminAddress);
  try {
    bot.editMessageText(text, {
      parse_mode: 'HTML',
      chat_id: chatId,
      message_id: messageId,
      reply_markup: buttons,
    });
  } catch (e) {}
  if (initialMessage) {
    bot.deleteMessage(chatId, initialMessage.message_id);
  }
}

function setClearCommand(chatId, messageId, adminAddress) {
  if (contract[chatId] && contract[chatId][adminAddress]) {
    contract[chatId][adminAddress].strategy = [];
    contract[chatId][adminAddress].ethChange = 0;
    contract[chatId][adminAddress].doubleBool = false;
    contract[chatId][adminAddress].HalfBool = false;
    contract[chatId][adminAddress].slippage = '';
    const text = tradeText(chatId, adminAddress);

    bot.editMessageText(text, {
      parse_mode: 'HTML',
      chat_id: chatId,
      message_id: messageId,
      reply_markup: buttons,
    });
  }
}

async function setWallet1(chatId) {
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }

  if (!privateKeys[chatId].hasOwnProperty(1)) {
    bot.sendMessage(
      chatId,
      'Please choose to "Import Wallet" or "Generate Wallet"'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][1];
    const wallet = await getWallet(privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(adminAddress);
    const wethBalance = await getTokenBalance(WETH, adminAddress);
    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;
    contract[chatId][adminAddress].wethBalance = wethBalance;
    contract[chatId][adminAddress].ethBase = (
      Number(ethBalance) + Number(wethBalance)
    ).toFixed(4);
    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 1;

    const text = `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🪙<b>WETH Balance:</b>\n${wethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: menuWallet,
      },
    });
  }
}
async function setWallet2(chatId) {
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }

  if (!privateKeys[chatId].hasOwnProperty(2)) {
    bot.sendMessage(
      chatId,
      'Please choose to "Import Wallet" or "Generate Wallet"'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][2];
    const wallet = await getWallet(privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(adminAddress);
    const wethBalance = await getTokenBalance(WETH, adminAddress);
    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;
    contract[chatId][adminAddress].wethBalance = wethBalance;
    contract[chatId][adminAddress].ethBase = (
      Number(ethBalance) + Number(wethBalance)
    ).toFixed(4);
    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 2;
    const text = `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🪙<b>WETH Balance:</b>\n${wethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: menuWallet,
      },
    });
  }
}
async function setWallet3(chatId) {
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }

  if (!privateKeys[chatId].hasOwnProperty(3)) {
    bot.sendMessage(
      chatId,
      'Please choose to "Import Wallet" or "Generate Wallet"'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][3];
    const wallet = await getWallet(privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(adminAddress);
    const wethBalance = await getTokenBalance(WETH, adminAddress);
    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;
    contract[chatId][adminAddress].wethBalance = wethBalance;
    contract[chatId][adminAddress].ethBase = (
      Number(ethBalance) + Number(wethBalance)
    ).toFixed(4);
    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 3;
    const text = `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🪙<b>WETH Balance:</b>\n${wethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: menuWallet,
      },
    });
  }
}

async function setRevokeAllCommand(chatId, adminAddress) {
  try {
    const chatIdforadminAddress = chatId + '-' + adminAddress;

    if (selectedOptions[chatIdforadminAddress]) {
      const contractAddresseses = Object.keys(
        selectedOptions[chatIdforadminAddress]
      );
      selectedOptions[chatIdforadminAddress] ??= {};
      for (const contractAddress of contractAddresseses) {
        selectedOptions[chatIdforadminAddress][contractAddress].strategy = [];
        selectedOptions[chatIdforadminAddress][contractAddress].change = true;
      }
      bot.sendMessage(
        chatId,
        `The trading strategies you uploaded have been cleared.`
      );
    } else {
      bot.sendMessage(chatId, 'No trading strategies available at the moment.');
    }
  } catch (e) {
    console.error(e);
  }
}

async function setRevokeCommand(chatId, adminAddress) {
  try {
    const chatIdforadminAddress = chatId + '-' + adminAddress;
    if (selectedOptions[chatIdforadminAddress]) {
      bot.sendMessage(
        chatId,
        'Please enter the contract address for the strategy you want to revoke:'
      );

      bot.once('message', (msg) => {
        const address = msg.text;
        if (isValidAddress(address)) {
          selectedOptions[chatIdforadminAddress] ??= {};
          if (selectedOptions[chatIdforadminAddress][address]) {
            selectedOptions[chatIdforadminAddress][address].strategy = [];
            selectedOptions[chatIdforadminAddress][address].change = true;
            bot.sendMessage(
              chatId,
              `The trading strategies you uploaded have been cleared.`
            );
          } else {
            bot.sendMessage(chatId, 'Please enter a valid address.');
          }
        } else {
          bot.sendMessage(chatId, 'Please enter a valid address.');
        }
      });
    } else {
      bot.sendMessage(chatId, 'No trading strategies available at the moment.');
    }
  } catch (e) {
    console.error(e);
  }
}
async function setCheckCommand(chatId, adminAddress) {
  try {
    const chatIdforadminAddress = chatId + '-' + adminAddress;

    if (selectedOptions[chatIdforadminAddress]) {
      const contractAddresseses = Object.keys(
        selectedOptions[chatIdforadminAddress]
      );
      const strategyText = contractAddresseses
        .map((contractAddress) => {
          const strategies =
            selectedOptions[chatIdforadminAddress][contractAddress].strategy;
          const strategySingle = strategies.map(
            (strategy, index) =>
              `\n🌟 Trading Strategy ${index + 1}: ${strategy.condition} ${
                strategy.action
              }\n🌟 Initial Price: ${strategy.origin} USD\n🌟 Base: ${
                strategy.balance
              }`
          );
          const contractText = `\nContract Address:\n${contractAddress}`;

          return contractText + strategySingle;
        })
        .join('');

      bot.sendMessage(
        chatId,
        `Wallet Address\n❤️ ${adminAddress}\nStrategy Collection:\n${strategyText}`
      );
    } else {
      bot.sendMessage(chatId, 'No trading strategies available at the moment.');
    }
  } catch (e) {
    console.error(e);
  }
}

async function setSlippage(chatId, messageId, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    'Please enter the slippage, e.g.: 5%'
  );

  bot.once('message', async (msg) => {
    const slippage = msg.text;
    const regex = /^(\d+(\.\d+)?)%$/;
    if (regex.test(slippage)) {
      contract[chatId][adminAddress].slippage = slippage;
    } else {
      bot
        .sendMessage(
          chatId,
          'Incorrect slippage format. Please click "MaxSlippage" again.'
        )
        .then((sentMessage) => {
          // Delete the message after 10 seconds
          setTimeout(() => {
            bot.editMessageText('', {
              parse_mode: 'HTML',
              chat_id: sentMessage.chat.id,
              message_id: sentMessage.message_id,
            });
          }, 10000);
        });
    }
    bot.deleteMessage(chatId, msg.message_id);
    bot.deleteMessage(chatId, initialMessage.message_id);
    const text = tradeText(chatId, adminAddress);
    bot.editMessageText(text, {
      parse_mode: 'HTML',
      chat_id: chatId,
      message_id: messageId,
      reply_markup: buttons,
    });
  });
}
function tradeText(chatId, adminAddress) {
  const contractAddress = contract[chatId][adminAddress]?.contractAddress || '';
  const ethBalance = contract[chatId][adminAddress]?.ethBalance || '';
  const wethBalance = contract[chatId][adminAddress].wethBalance || '';
  const tokenBalance = contract[chatId][adminAddress]?.tokenBalance || '';
  const ethBase = contract[chatId][adminAddress]?.ethBase || '';
  // const tokenBase = contract[chatId][adminAddress]?.tokenBase || '';
  const currentPrice = contract[chatId][adminAddress]?.currentPrice || '';
  const strategy = contract[chatId][adminAddress]?.strategy || [];
  const doubleBool = contract[chatId][adminAddress]?.doubleBool || false;
  const HalfBool = contract[chatId][adminAddress]?.HalfBool || false;
  const slippage = contract[chatId][adminAddress]?.slippage || '';
  const strategyText = strategy
    .map(
      (item, index) =>
        `\n🤖️<b>Trading Strategy</b> ${index + 1}:\n    ${item.condition} ${
          item.action
        } \n    Initial Price: ${item.origin} Base: ${item.balance}`
    )
    .join('');
  const doubleSell = doubleBool
    ? '🌟🌟 Double and Sell Half Strategy Added! 🌟🌟\n\n'
    : '🌟<b>A:</b> Double and Sell Half\n';
  const halfSell = HalfBool
    ? '🌟🌟 Cut in Half and Sell All Strategy Added! 🌟🌟\n\n'
    : '🌟<b>B:</b> Cut in Half and Sell All';
  const slippageText =
    slippage !== '' ? `\n<b>Maximum Slippage:</b> ${slippage}` : '';

  const text = `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🪙<b>WETH Balance:</b>\n${wethBalance}\n🐶<b>Contract Address:</b>\n${contractAddress}\n📈<b>Current Price:</b> ${currentPrice} USD\n🎫<b>Token Balance:</b> ${tokenBalance}\n🎫<b>ETH Balance (including WETH):</b> ${ethBase}${slippageText}\n\n${doubleSell}${halfSell}${strategyText}\n\n<b>Strategy Setup Order:</b>\n 1️⃣  up|down 2️⃣  X% 3️⃣  buy|sell 4️⃣  X%\n<b>Example:</b> up 50% sell 10%\n\n<b>Note</b>: If you choose other wallet operations later and want to perform this contract operation again, please reset it with the wallet as the entry point.`;

  return text;
}

async function setHalfSell(chatId, adminAddress) {
  const strategy = {
    condition: 'down 50%',
    action: 'sell 100%',
    origin: contract[chatId][adminAddress].currentPrice,
    balance: contract[chatId][adminAddress].tokenBalance,
    slippage: contract[chatId][adminAddress].slippage || '5%',
  };

  contract[chatId][adminAddress].strategy ??= [];
  contract[chatId][adminAddress].strategy.push(strategy);
  contract[chatId][adminAddress].HalfBool = true;
}
async function setDoubleSell(chatId, adminAddress) {
  const strategy = {
    condition: 'up 100%',
    action: 'sell 50%',
    origin: contract[chatId][adminAddress].currentPrice,
    balance: contract[chatId][adminAddress].tokenBalance,
    slippage: contract[chatId][adminAddress].slippage || '5%',
  };

  contract[chatId][adminAddress].strategy ??= [];
  contract[chatId][adminAddress].strategy.push(strategy);
  contract[chatId][adminAddress].doubleBool = true;
}

async function setContractCommand(chatId, messageId, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    'Enter the contract address for quantitative trading:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      try {
        const waitMessage = await bot.sendMessage(
          chatId,
          'Please wait while the contract is being read...'
        );
        // contract[chatId] ??= {};
        // contract[chatId][adminAddress] ??= {};
        const ethPrice = await getETHPrice();

        const tokenBalance = await getTokenBalance(address, adminAddress);
        const decimals = await getToken(address);

        const currentPrice = await getTokenPriceV2(address, decimals);
        if (!currentPrice) {
          bot.sendMessage(chatId, 'LP does not exist.');
          return;
        }

        contract[chatId][adminAddress].contractAddress = msg.text;
        contract[chatId][adminAddress].tokenBalance = tokenBalance;
        contract[chatId][adminAddress].currentPrice = currentPrice
          ? ethPrice * currentPrice
          : '';
        contract[chatId][adminAddress].doubleBool = false;

        // contract[chatId][adminAddress][contractAddress].selected = [];
        const text = tradeText(chatId, adminAddress);
        bot.editMessageText(text, {
          parse_mode: 'HTML',
          chat_id: chatId,
          message_id: messageId,
          reply_markup: buttons,
        });
        bot.deleteMessage(chatId, waitMessage.message_id);
        bot.deleteMessage(chatId, msg.message_id);
        bot.deleteMessage(chatId, initialMessage.message_id);
      } catch (e) {
        console.error(e);
      }
    } else {
      bot.sendMessage(chatId, 'Please enter a valid address.');
    }
  });
}

async function strategyCommand(chatId, adminAddress) {
  const ethBalance = contract[chatId][adminAddress].ethBalance;
  const wethBalance = contract[chatId][adminAddress].wethBalance;
  const text = `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🪙<b>WETH Balance:</b>\n${wethBalance}\n\n<b>Please set the token contract address for trading first.</b>`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: buttons,
  });
}

function addressSecurityCommand(chatId) {
  bot.sendMessage(
    chatId,
    'Please send the address of the deployment contract you want to check:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      addressSecurity(bot, chatId, address);
    } else {
      bot.sendMessage(chatId, 'Please enter a valid address:');
    }
  });
}

function tokenSecurityCommand(chatId) {
  bot.sendMessage(
    chatId,
    'Please send the contract address you want to check:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      tokenSecurity(bot, chatId, address);
    } else {
      bot.sendMessage(chatId, 'Please enter a valid address:');
    }
  });
}
function generateWallet(chatId) {
  bot.sendMessage(chatId, 'Please send wallet Number,e.g.:1');
  bot.once('message', async (msg) => {
    const number = Number(msg.text);
    if (number === 1 || number === 2 || number === 3) {
      const wallet = ethers.Wallet.createRandom();
      if (!privateKeys[chatId]) {
        privateKeys[chatId] = {};
      }
      privateKeys[chatId][number] = wallet.privateKey;

      if (!privateKeysforAddress[chatId]) {
        privateKeysforAddress[chatId] = {};
      }
      const address = wallet.address;
      privateKeysforAddress[chatId][address] = wallet.privateKey;
      const privateKey = wallet.privateKey;
      bot.sendMessage(
        chatId,
        `Wallet Address:\n${address}\nPrivate Key:\n${privateKey}\n⚠️ Note: We do not store your private key and will not assist with recovery. Please keep it safe.`
      );
      return;
    } else {
      bot.sendMessage(chatId, 'Please enter the correct number');
    }
  });
}

function privatekey(chatId) {
  bot.sendMessage(
    chatId,
    'Please send your private key and wallet number,e.g.:privatekey 1'
  );

  bot.once('message', async (msg) => {
    const [privateKey, number] = msg.text.split(' ');
    const order = Number(number);
    try {
      // 检查地址是不是长度为32字节的私钥，如果还有别的办法判断是私钥你可以帮我添加
      if (isValidPrivateKey(privateKey)) {
        if (order === 1 || order === 2 || order === 3) {
          privateKeys[chatId][order] = privateKey;
          if (!privateKeysforAddress[chatId]) {
            privateKeysforAddress[chatId] = {};
          }

          const wallet = new ethers.Wallet(privateKey);
          const address = wallet.address;
          privateKeysforAddress[chatId][address] = wallet.privateKey;
          bot.sendMessage(chatId, 'Valid private key has been imported.');
        } else {
          bot.sendMessage(chatId, 'Please enter the correct number');
        }
      } else {
        bot.sendMessage(
          chatId,
          'The private key is not of valid length. Please resend!'
        );
      }
    } catch (error) {
      bot.sendMessage(
        chatId,
        'The private key is not of valid length or the wallet number is not correct. Please resend!'
      );
    }
  });
}

async function check(chatId) {
  bot.sendMessage(chatId, 'Please send your address:');

  bot.once('message', async (msg) => {
    const address = msg.text.trim();
    // 检查地址是不是 0x 开头，并且长度为 42
    try {
      if (isValidAddress(address)) {
        const balance = await getBalance(address);
        bot.sendMessage(
          chatId,
          `The balance of address ${address} is: ${balance} ETH`
        );
      } else {
        bot.sendMessage(
          chatId,
          'Unable to retrieve address balance. Please ensure the address is valid.'
        );
      }
    } catch (e) {
      bot.sendMessage(
        chatId,
        'Unable to retrieve address balance. Please ensure the address is valid.'
      );
    }
  });
}

async function sendETH(chatId, privateKey) {
  try {
    const wallet = await getWallet(privateKey);
    const adminAddress = await wallet.getAddress();

    bot.sendMessage(
      chatId,
      'Please enter the address and amount to send in the format:\n{address} {amount}\nFor example:\n0xdc43b25f3abf65825e52b73441e47f2ce0f9c47d 0.1'
    );

    bot.once('message', async (msg) => {
      const [address, amount] = msg.text.split(' ');
      if (isValidAddress(address)) {
        const balance = await getBalance(adminAddress);

        if (balance > amount) {
          const tx = {
            to: address,
            value: ethers.utils.parseEther(amount),
          };
          const receipt = await wallet.sendTransaction(tx);
          await receipt.wait();
          bot.sendMessage(chatId, `Transaction hash: ${receipt.hash}`);
        } else {
          bot.sendMessage(
            chatId,
            `The balance of wallet address ${adminAddress} is: ${balance} ETH. Sending is not supported.`
          );
        }
      } else {
        bot.sendMessage(chatId, 'Please enter a valid address.');
      }
    });
  } catch (e) {
    console.error(e);
  }
}

bot.onText(/\/generatewallet/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Please send wallet Number,e.g.:1');
  bot.once('message', async (msg) => {
    const number = Number(msg.text);
    if (number === 1 || number === 2 || number === 3) {
      const wallet = ethers.Wallet.createRandom();
      if (!privateKeys[chatId]) {
        privateKeys[chatId] = {};
      }
      privateKeys[chatId][number] = wallet.privateKey;

      if (!privateKeysforAddress[chatId]) {
        privateKeysforAddress[chatId] = {};
      }
      const address = wallet.address;
      privateKeysforAddress[chatId][address] = wallet.privateKey;
      const privateKey = wallet.privateKey;
      bot.sendMessage(
        chatId,
        `*Wallet Address:*\n${address}\n*Private Key:*\n${privateKey}\n⚠️ \`Note: We do not store your private key and will not assist with recovery. Please keep it safe.\``,
        { parse_mode: 'Markdown' }
      );
      return;
    } else {
      bot.sendMessage(chatId, 'Please enter the correct number');
    }
  });
});

bot.onText(/\/privatekey/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Please send your private key and wallet number,e.g.:privatekey 1'
  );

  bot.once('message', async (msg) => {
    const [privateKey, number] = msg.text.split(' ');
    const order = Number(number);
    try {
      // 检查地址是不是长度为32字节的私钥，如果还有别的办法判断是私钥你可以帮我添加
      if (isValidPrivateKey(privateKey)) {
        if (order === 1 || order === 2 || order === 3) {
          privateKeys[chatId][order] = privateKey;
          if (!privateKeysforAddress[chatId]) {
            privateKeysforAddress[chatId] = {};
          }

          const wallet = new ethers.Wallet(privateKey);
          const address = wallet.address;
          privateKeysforAddress[chatId][address] = wallet.privateKey;
          bot.sendMessage(chatId, 'Valid private key has been imported.');
        } else {
          bot.sendMessage(chatId, 'Please enter the correct number');
        }
      } else {
        bot.sendMessage(
          chatId,
          'The private key is not of valid length. Please resend!'
        );
      }
    } catch (error) {
      bot.sendMessage(
        chatId,
        'The private key is not of valid length or the wallet number is not correct. Please resend!'
      );
    }
  });
});

bot.onText(/\/addresssecurity/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Please send the address of the deployment contract you want to check:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      addressSecurity(bot, chatId, address);
    } else {
      bot.sendMessage(chatId, 'Please enter a valid address:');
    }
  });
});

bot.onText(/\/tokensecurity/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Please send the contract address you want to check:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      tokenSecurity(bot, chatId, address);
    } else {
      bot.sendMessage(chatId, 'Please enter a valid address:');
    }
  });
});
