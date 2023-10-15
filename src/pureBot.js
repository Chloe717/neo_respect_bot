/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-10-14 20:31:29
 * @Description:
 */
const TelegramBot = require('node-telegram-bot-api');

const { tokenSecurity } = require('./tokenSecurity.js');
const { addressSecurity } = require('./addressSecurity.js');
const { processUserStrategies } = require('./UserTradingStrategy.js');
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
  connectMongodb,
  getApprove,
  getTokenPriceV2,
  fromReadableAmount,
  getEstimate,
  executeBuy,
  executeSell,
  setSwap,
  contractEstimate,
  keyboardSlice,
  keyboardC,
  menuC,
  menuWalletC,
  keyboardSliceC,
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
let mainnetSelectedOptions = {};
let goerliSelectedOptions = {};
//chatId=>selected
let strategySeletcted = {};
//chatId=>address have strategy
let chatIdforAddress = {};
//chatId=>netwrok/language
let selectedNetwork = {};
//chatId=>messageId
let chatIdformessageId = {};

//轮询策略
setSwap();
processUserStrategies(
  bot,
  mainnetSelectedOptions,
  privateKeysforAddress,
  'NEOEVM',
  selectedNetwork
);
processUserStrategies(
  bot,
  goerliSelectedOptions,
  privateKeysforAddress,
  'GOERLI',
  selectedNetwork
);

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const inviteMessage = msg.text.split(' ');
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].network ??= 'NEOEVM';
  selectedNetwork[chatId].language ??= 'English';

  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? `Welcome to the RΞSPECT Bot! 😄\n🤖Customize your meme trades with our bot! \n🚀Whether it's a bullish run or a bearish slide📉\n<b>💥You'll catch it!</b> \n🤔️No need to constantly watch the market's ups and downs. \n💼Let us handle it for you!\n\nJust follow me:\nStep 1: Network Selection(Default Mainnet)\nStep 2: click Import Wallet or Generate Wallet\nStep 3: choose a Wallet to operate\n`
      : `欢迎来到 RΞSPECT Bot！ 😄\n🤖我们的目标是帮住你定制meme交易并严格执行！\n🚀无论是看涨还是看跌📉\n<b>💥您都能抓住它！</b>\n🤔️无需持续关注市场的涨跌。\n💼让我们来替您处理！\n\n只需跟随以下步骤：\n第一步：网络选择（默认neoevm）\n第二步：点击导入钱包或生成钱包\n第三步：选择要操作的钱包\n`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English' ? menu : menuC,
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
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].network ??= 'NEOEVM';
  selectedNetwork[chatId].language ??= 'English';
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
    case '/honeypot':
      // The user clicked the button, trigger the /strategy logic

      honeypotCommand(chatId, adminAddress);

      break;
    case 'Double':
      // The user clicked the button, trigger the /strategy logic
      if (!contract[chatId]?.[adminAddress]?.contractAddress) {
        bot
          .sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Please set the contract address by clicking on SetContract'
              : '请通过点击“设置合约”'
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
        reply_markup: {
          inline_keyboard:
            selectedNetwork[chatId].language === 'English'
              ? keyboardSlice
              : keyboardSliceC,
        },
      });

      break;
    case 'Half':
      // The user clicked the button, trigger the /strategy logic
      if (!contract[chatId][adminAddress].contractAddress) {
        bot
          .sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Please set the contract address by clicking on SetContract'
              : '请通过点击“设置合约”'
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
        reply_markup: {
          inline_keyboard:
            selectedNetwork[chatId].language === 'English'
              ? keyboardSlice
              : keyboardSliceC,
        },
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
    case 'neoevm':
      setNetwork(chatId, 'NEOEVM');

      break;
    case 'goerli':
      setNetwork(chatId, 'GOERLI');

      break;
    case 'English':
      setLanguage(chatId, 'English', messageId);

      break;
    case 'Chinese':
      setLanguage(chatId, 'Chinese', messageId);

      break;
    case '/Referral':
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `🔗Referral Link:\nhttps://t.me/respect_meme_bot?start=${chatId}`
          : `🔗推广链接:\nhttps://t.me/respect_meme_bot?start=${chatId}`
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
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `Generated Strategy:${buttonPressed}`
          : `生成策略:${buttonPressed}`
      )
      .then((sentMessage) => {
        strategySeletcted[chatId].messageId = sentMessage.message_id;
      });
  } else if (
    selected.length === 1 &&
    (pattern.test(buttonPressed) || buttonPressed === 'custom')
  ) {
    try {
      if (pattern.test(buttonPressed)) {
        strategySeletcted[chatId].selected.push(buttonPressed);
        const messageStrategy = strategySeletcted[chatId].selected.join(' ');
        if (strategySeletcted[chatId].messageId) {
          await bot.editMessageText(
            selectedNetwork[chatId].language === 'English'
              ? `Generated Strategy:${messageStrategy}`
              : `生成策略:${messageStrategy}`,
            {
              parse_mode: 'HTML',
              chat_id: chatId,
              message_id: strategySeletcted[chatId].messageId,
            }
          );
        }
      } else {
        const initialMessage = await bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'Please enter the percentage, e.g.: 50%'
            : '请输入百分比，例如：50%'
        );

        bot.once('message', async (msg) => {
          const percentage = msg.text;
          const regex = /^(\d+(\.\d+)?)%$/;
          if (regex.test(percentage)) {
            strategySeletcted[chatId].selected.push(percentage);
            const messageStrategy =
              strategySeletcted[chatId].selected.join(' ');
            if (strategySeletcted[chatId].messageId) {
              await bot.editMessageText(
                selectedNetwork[chatId].language === 'English'
                  ? `Generated Strategy:${messageStrategy}`
                  : `生成策略:${messageStrategy}`,
                {
                  parse_mode: 'HTML',
                  chat_id: chatId,
                  message_id: strategySeletcted[chatId].messageId,
                }
              );
            }
          } else {
            bot
              .sendMessage(
                chatId,
                selectedNetwork[chatId].language === 'English'
                  ? 'Incorrect percentage format. Please click "custom" again.'
                  : '百分比格式不正确，请再次点击“自定义”。'
              )
              .then((sentMessage) => {
                setTimeout(() => {
                  bot.deleteMessage(
                    sentMessage.chat.id,
                    sentMessage.message_id
                  );
                }, 5000);
              });
          }
          bot.deleteMessage(chatId, msg.message_id);
          bot.deleteMessage(chatId, initialMessage.message_id);
        });
      }
    } catch (e) {}
  } else if (
    selected.length === 2 &&
    (buttonPressed === 'buy' || buttonPressed === 'sell')
  ) {
    strategySeletcted[chatId].selected.push(buttonPressed);
    const messageStrategy = strategySeletcted[chatId].selected.join(' ');
    if (strategySeletcted[chatId].messageId)
      await bot.editMessageText(
        selectedNetwork[chatId].language === 'English'
          ? `Generated Strategy:${messageStrategy}`
          : `生成策略:${messageStrategy}`,
        {
          parse_mode: 'HTML',
          chat_id: chatId,
          message_id: strategySeletcted[chatId].messageId,
        }
      );
  } else if (
    selected.length === 3 &&
    (pattern.test(buttonPressed) || buttonPressed === 'custom')
  ) {
    if (pattern.test(buttonPressed)) {
      //实时输出策略
      strategySeletcted[chatId].selected.push(buttonPressed);
      const messageStrategy = strategySeletcted[chatId].selected.join(' ');
      if (strategySeletcted[chatId].messageId) {
        await bot.editMessageText(
          selectedNetwork[chatId].language === 'English'
            ? `Generated Strategy:${messageStrategy}`
            : `生成策略:${messageStrategy}`,
          {
            parse_mode: 'HTML',
            chat_id: chatId,
            message_id: strategySeletcted[chatId].messageId,
          }
        );
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
          .sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Cannot set this strategy with a balance of zero'
              : '余额为0无法设置策略'
          )
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
            ? contract[chatId][adminAddress].ethBalance
            : contract[chatId][adminAddress].tokenBalance,
        slippage: contract[chatId][adminAddress].slippage || '5%',
      };

      contract[chatId][adminAddress].ethChange ??= 0;

      if (strategySeletcted[chatId].selected[2] === 'buy') {
        contract[chatId][adminAddress].ethChange +=
          (parseInt(strategySeletcted[chatId].selected[3], 10) / 100) *
          contract[chatId][adminAddress].ethBalance;
      }

      contract[chatId][adminAddress].strategy ??= [];
      if (contract[chatId][adminAddress].strategy.length === 3) {
        contract[chatId][adminAddress].strategy = [];
        bot
          .sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'You can set up to three strategies at most.'
              : '最多只能设置三个策略'
          )
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
        reply_markup: {
          inline_keyboard:
            selectedNetwork[chatId].language === 'English'
              ? keyboardSlice
              : keyboardSliceC,
        },
      });

      await bot.deleteMessage(chatId, strategySeletcted[chatId].messageId);

      strategySeletcted[chatId].messageId = null;
    } else {
      const customMessage = await bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter the percentage, e.g.: 50%'
          : '设置百分比，例如:50%'
      );

      bot.once('message', async (msg) => {
        const percentage = msg.text;
        const regex = /^(\d+(\.\d+)?)%$/;
        if (regex.test(percentage)) {
          console.log(percentage);
          strategySeletcted[chatId].selected.push(percentage);
          const messageStrategy = strategySeletcted[chatId].selected.join(' ');
          if (strategySeletcted[chatId].messageId) {
            await bot.editMessageText(
              selectedNetwork[chatId].language === 'English'
                ? `Generated Strategy:${messageStrategy}`
                : `生成策略:${messageStrategy}`,
              {
                parse_mode: 'HTML',
                chat_id: chatId,
                message_id: strategySeletcted[chatId].messageId,
              }
            );
          }
        } else {
          bot
            .sendMessage(
              chatId,
              'Incorrect percentage format. Please click "custom" again.'
            )
            .then((sentMessage) => {
              setTimeout(() => {
                bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
              }, 5000);
            });
        }
        bot.deleteMessage(chatId, msg.message_id);
        bot.deleteMessage(chatId, customMessage.message_id);
        if (
          (strategySeletcted[chatId].selected[2] === 'buy' &&
            Number(contract[chatId][adminAddress].ethBalance) === 0) ||
          (strategySeletcted[chatId].selected[2] === 'sell' &&
            Number(contract[chatId][adminAddress].tokenBalance) === 0)
        ) {
          strategySeletcted[chatId].selected = [];

          await bot.deleteMessage(chatId, strategySeletcted[chatId].messageId);

          bot
            .sendMessage(
              chatId,
              selectedNetwork[chatId].language === 'English'
                ? 'Cannot set this strategy with a balance of zero'
                : '余额为0不能设置策略'
            )
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
              ? contract[chatId][adminAddress].ethBalance
              : contract[chatId][adminAddress].tokenBalance,
          slippage: contract[chatId][adminAddress].slippage || '5%',
        };

        contract[chatId][adminAddress].ethChange ??= 0;

        if (strategySeletcted[chatId].selected[2] === 'buy') {
          contract[chatId][adminAddress].ethChange +=
            (parseInt(strategySeletcted[chatId].selected[3], 10) / 100) *
            contract[chatId][adminAddress].ethBalance;
        }

        contract[chatId][adminAddress].strategy ??= [];
        if (contract[chatId][adminAddress].strategy.length === 3) {
          contract[chatId][adminAddress].strategy = [];
          bot
            .sendMessage(
              chatId,
              selectedNetwork[chatId].language === 'English'
                ? 'You can set up to three strategies at most.'
                : '最多只能设置三个策略'
            )
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
          reply_markup: {
            inline_keyboard:
              selectedNetwork[chatId].language === 'English'
                ? keyboardSlice
                : keyboardSliceC,
          },
        });

        await bot.deleteMessage(chatId, strategySeletcted[chatId].messageId);

        strategySeletcted[chatId].messageId = null;
      });
    }
  } else if (buttonPressed === 'finish') {
    // 用户点击 "Finish" 按钮，返回用户选择的所有选项数组

    bot
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Submitting strategies...'
          : '提交策略。。。'
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
        }, 5000);
      });
    if (!contract[chatId]?.[adminAddress]?.contractAddress) {
      bot
        .sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'Please set the contract address and click "Trade" to reset.'
            : '合约地址未设置，请点击“Trade”重置。'
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
            selectedNetwork[chatId].language === 'English'
              ? 'You can set strategies for up to three addresses at most.'
              : '最多三个地址可同时定制策略'
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
    let contracts;
    if (selectedNetwork[chatId].network === 'NEOEVM') {
      mainnetSelectedOptions[chatIdforadminAddress] ??= {};
      contracts = Object.keys(mainnetSelectedOptions[chatIdforadminAddress]);
    } else if (selectedNetwork[chatId].network === 'GOERLI') {
      goerliSelectedOptions[chatIdforadminAddress] ??= {};
      contracts = Object.keys(goerliSelectedOptions[chatIdforadminAddress]);
    }

    if (!contract[chatId]?.[adminAddress]?.strategy?.length) {
      // Strategy is an empty array or undefined
      return;
    }
    const strategy = contract[chatId][adminAddress]?.strategy;

    const ethChange = Number(contract[chatId][adminAddress].ethChange);

    const costETH = Number(strategy.length * 0.01);

    const ethBalance = Number(contract[chatId][adminAddress].ethBalance);
    // const tokenBalance = Number(contract[chatId][adminAddress].tokenBalance);
    // console.log(
    //   `ethChange:${ethChange} ethBalance:${ethBalance} ethCost:${costETH}`
    // );

    if (ethBalance < ethChange + costETH) {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'The ETH balance is not sufficient to execute all strategies.'
          : 'ETH余额不够支付所有策略交易'
      );

      contract[chatId][adminAddress].strategy = [];
      contract[chatId][adminAddress].ethChange = 0;
      contract[chatId][adminAddress].doubleBool = false;
      contract[chatId][adminAddress].HalfBool = false;
      contract[chatId][adminAddress].slippage = '';
      return;
    }

    // selectedOptions[chatId][adminAddress] ??= {};
    if (selectedNetwork[chatId].network === 'NEOEVM') {
      mainnetSelectedOptions[chatIdforadminAddress][contractAddress] ??= {};
      mainnetSelectedOptions[chatIdforadminAddress][contractAddress].strategy =
        strategy;
      mainnetSelectedOptions[chatIdforadminAddress][
        contractAddress
      ].change = true;
    } else if (selectedNetwork[chatId].network === 'GOERLI') {
      goerliSelectedOptions[chatIdforadminAddress][contractAddress] ??= {};
      goerliSelectedOptions[chatIdforadminAddress][contractAddress].strategy =
        strategy;
      goerliSelectedOptions[chatIdforadminAddress][
        contractAddress
      ].change = true;
    }

    const strategyText = strategy
      .map((item, index) =>
        selectedNetwork[chatId].language === 'English'
          ? `\n🚀<b>Trading Strategy</b> ${index + 1}:\n    ${
              item.condition
            }  ${item.action}\n    Initial Price: ${item.origin} Base: ${
              item.balance
            }`
          : `\n🚀<b>交易策略</b> ${index + 1}:\n    ${item.condition}  ${
              item.action
            }\n    初始价格: ${item.origin} 基数: ${item.balance}`
      )
      .join('');

    bot
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `🔍 You have customized strategies for the token contract!!\n\n  ${contract[chatId][adminAddress].contractAddress}\n${strategyText}`
          : `🔍 代币合约成功定制自定义交易策略!!\n\n  ${contract[chatId][adminAddress].contractAddress}\n${strategyText}`,
        { parse_mode: 'HTML' }
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, sentMessage.message_id);
        }, 10000);
      });

    await getApprove(
      selectedNetwork[chatId].network,
      contractAddress,
      privateKey
    );
    if (selectedNetwork[chatId].network === 'NEOEVM') {
      await connectMongodb(mainnetSelectedOptions);
    } else if (selectedNetwork[chatId].network === 'GOERLI') {
      await connectMongodb(goerliSelectedOptions);
    }

    contract[chatId][adminAddress].strategy = [];
    contract[chatId][adminAddress].ethChange = 0;
    contract[chatId][adminAddress].doubleBool = false;
    contract[chatId][adminAddress].HalfBool = false;
    contract[chatId][adminAddress].slippage = '';

    // } else {
    //   bot.sendMessage(chatId, '请按正确的顺序选择');
  }
});

async function honeypotCommand(chatId, adminAddress) {
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send the contract address you want to check:'
      : '发送你想检测的合约地址'
  );

  bot.once('message', async (msg) => {
    const tokenAddress = msg.text;
    if (isValidAddress(tokenAddress)) {
      const network = selectedNetwork[chatId].network;
      if (network === 'NEOEVM') {
        tokenSecurity(
          bot,
          chatId,
          tokenAddress,
          selectedNetwork[chatId].language
        );
      } else {
        const results = await contractEstimate(
          network,
          tokenAddress,
          adminAddress
        );
        let honeypotText =
          selectedNetwork[chatId].language === 'English'
            ? `
    🍯 \`Is Honypot: ${
      results?.honeypotResult ? results.honeypotResult.isHoneypot : 'Unknown'
    }\`
  📈 \`Buy Recommend Slippage: ${
    results?.simulationResult
      ? results.simulationResult.buyTax == 0
        ? '0.5'
        : Number(results.simulationResult.buyTax) + 0.5
      : 'Unknown'
  }%\`
  📉 \`Sell Recommend Slippage: ${
    results?.simulationResult
      ? results.simulationResult.sellTax == 0
        ? '0.5'
        : Number(results.simulationResult.sellTax) + 0.5
      : 'Unknown'
  }%\`
          `
            : `
    🍯 \`是否蜜罐: ${
      results?.honeypotResult
        ? results.honeypotResult.isHoneypot === true
          ? '是'
          : '否'
        : '未知'
    }\`
  📈 \`购买推荐滑点: ${
    results?.simulationResult
      ? results.simulationResult.buyTax == 0
        ? '0.5'
        : Number(results.simulationResult.buyTax) + 0.5
      : '未知'
  }%\`
  📉 \`出售推荐滑点: ${
    results?.simulationResult
      ? results.simulationResult.sellTax == 0
        ? '0.5'
        : Number(results.simulationResult.sellTax) + 0.5
      : '未知'
  }%\`
          `;
        bot.sendMessage(chatId, honeypotText, { parse_mode: 'Markdown' });
      }
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address:'
          : '请发送有效地址'
      );
    }
  });
}
async function setNetwork(chatId, network) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].network = network;

  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? `🎉The network has been switched: ${selectedNetwork[chatId].network}🎉`
      : `🎉网络已经切换为: ${selectedNetwork[chatId].network}🎉`
  );
}
async function setLanguage(chatId, language, messageId) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language = language;
  const text =
    selectedNetwork[chatId].language === 'English'
      ? `Welcome to the RΞSPECT Bot! 😄\n🤖Customize your meme trades with our bot! \n🚀Whether it's a bullish run or a bearish slide📉\n<b>💥You'll catch it!</b> \n🤔️No need to constantly watch the market's ups and downs. \n💼Let us handle it for you!\n\nJust follow me:\nStep 1: Network Selection(Default NEOEVM)\nStep 2: click Import Wallet or Generate Wallet\nStep 3: choose a Wallet to operate\n`
      : `欢迎来到 RΞSPECT Bot！ 😄\n🤖我们的目标是帮住你定制交易并严格执行！\n🚀无论是看涨还是看跌📉\n<b>💥您都能抓住它！</b>\n🤔️无需持续关注市场的涨跌。\n💼让我们来替您处理！\n\n只需跟随以下步骤：\n第一步：网络选择（默认neoevm）\n第二步：点击导入钱包或生成钱包\n第三步：选择要操作的钱包\n`;

  bot.editMessageText(text, {
    parse_mode: 'HTML',
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard:
        selectedNetwork[chatId].language === 'English' ? menu : menuC,
    },
  });

  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? `🎉The language has been switched: Englsih🎉`
      : `🎉语言已经切换为: 中文🎉`
  );
}
async function getEstimateCommand(chatId, adminAddress) {
  const tokenAddress = contract[chatId]?.[adminAddress]?.contractAddress;

  let honeypotText;
  try {
    const results = await getEstimate(
      selectedNetwork[chatId].network,
      tokenAddress,
      adminAddress
    );

    honeypotText =
      selectedNetwork[chatId].language === 'English'
        ? `
    🍯 \`Is Honypot: ${
      results?.honeypotResult ? results.honeypotResult.isHoneypot : 'Unknown'
    }\`
  📈 \`Buy Recommend Slippage: ${
    results?.simulationResult
      ? results.simulationResult.buyTax == 0
        ? '0.5'
        : Number(results.simulationResult.buyTax) + 0.5
      : 'Unknown'
  }%\`
  📉 \`Sell Recommend Slippage: ${
    results?.simulationResult
      ? results.simulationResult.sellTax == 0
        ? '0.5'
        : Number(results.simulationResult.sellTax) + 0.5
      : 'Unknown'
  }%\`
          `
        : `
    🍯 \`是否蜜罐: ${
      results?.honeypotResult
        ? results.honeypotResult.isHoneypot === true
          ? '是'
          : '否'
        : '未知'
    }\`
  📈 \`购买推荐滑点: ${
    results?.simulationResult
      ? results.simulationResult.buyTax == 0
        ? '0.5'
        : Number(results.simulationResult.buyTax) + 0.5
      : '未知'
  }%\`
  📉 \`出售推荐滑点: ${
    results?.simulationResult
      ? results.simulationResult.sellTax == 0
        ? '0.5'
        : Number(results.simulationResult.sellTax) + 0.5
      : '未知'
  }%\`
          `;
  } catch (err) {
    honeypotText =
      selectedNetwork[chatId].language === 'English'
        ? `\`The contract is not open source.\``
        : `\`合约未开源\``;
  }
  bot.sendMessage(chatId, honeypotText, { parse_mode: 'Markdown' });
}

async function buyNow(chatId, privateKey, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please enter the amount of ETH to be traded, e.g.: 0.1'
      : '请输入要交易的ETH金额,例如: 0.1'
  );

  bot.once('message', async (msg) => {
    const amount = msg.text;
    const regex = /^\d+(\.\d+)?/;
    if (regex.test(amount) && Number(amount) > 0) {
      const actionMessage = await bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Executing transaction...'
          : '执行交易。。。'
      );

      const amountIn = Number(amount);

      const costETH = 0.01;

      const ethBalance = Number(contract[chatId][adminAddress].ethBalance);

      if (ethBalance < amountIn + costETH) {
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'The ETH balance is not sufficient to execute all strategies.'
            : 'ETH余额不足够执行所有策略'
        );
        return;
      }
      let slippage = contract[chatId]?.[adminAddress]?.slippage || '5%';
      slippage = parseFloat(slippage) / 100;
      const contractAddress = contract[chatId][adminAddress].contractAddress;
      const AmountInBig = ethers.utils.parseEther(amountIn.toString());

      const wallet = await getWallet(
        selectedNetwork[chatId].network,
        privateKey
      );
      const decimals = await getToken(
        selectedNetwork[chatId].network,
        contractAddress
      );
      let hash;

      try {
        const tx = await executeBuy(
          selectedNetwork[chatId].network,
          contractAddress,
          AmountInBig,
          adminAddress,
          wallet,
          slippage,
          decimals
        );
        hash = tx.hash;
      } catch (error) {
        console.log(error);
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? '`The gas or slippage settings are insufficient to fulfill this order...`'
            : '`gas或者滑点设置不够完成此订单。。。`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const beforeETHBalance = contract[chatId][adminAddress].ethBalance;
      const beforeTokenBalance = contract[chatId][adminAddress].tokenBalance;
      const afterTokenBalance = await getTokenBalance(
        selectedNetwork[chatId].network,
        contractAddress,
        adminAddress
      );
      const afterETHBalance = await getBalance(
        selectedNetwork[chatId].network,
        adminAddress
      );
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `👛 <b>Wallet Address</b>
      ${adminAddress}\n✉️ <b>Contract Address</b>
      ${contractAddress}\n🌈<b>Transaction Hash:</b>\n${hash}\n\n💰 <b>Before Transaction:</b>
      ETH Balance: ${beforeETHBalance}
      Token Balance: ${beforeTokenBalance}\n💰 <b>After Transaction:</b>
      ETH Balance: ${afterETHBalance}
      Token Balance: ${afterTokenBalance}`
          : `👛 <b>钱包地址</b>
      ${adminAddress}\n✉️ <b>合约地址</b>
      ${contractAddress}\n🌈<b>交易hash:</b>\n${hash}\n\n💰 <b>交易前:</b>
      ETH余额: ${beforeETHBalance}
      代币余额: ${beforeTokenBalance}\n💰 <b>交易后:</b>
      ETH余额: ${afterETHBalance}
      代币余额: ${afterTokenBalance}`,
        { parse_mode: 'HTML' }
      );
      bot.deleteMessage(chatId, actionMessage.message_id);
    } else {
      bot
        .sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'The input format is incorrect.Please click buyNow again'
            : '输入格式不正确，请再次点击“立刻购买”'
        )
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(chatId, sentMessage.message_id);
          }, 5000);
        });
    }

    bot.deleteMessage(chatId, initialMessage.message_id);
  });
}
async function sellNow(chatId, privateKey, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please enter the amount of token to be traded, e.g.: 10000'
      : '请输入代币交易数量,例如：1000'
  );

  bot.once('message', async (msg) => {
    const amount = msg.text;
    const regex = /^\d+(\.\d+)?/;
    if (regex.test(amount)) {
      const actionMessage = await bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Executing transaction...'
          : '执行交易。。。'
      );

      const amountIn = Number(amount);
      const beforeTokenBalance = Number(
        contract[chatId][adminAddress].tokenBalance
      );
      let slippage = contract[chatId]?.[adminAddress]?.slippage || '5%';
      slippage = parseFloat(slippage) / 100;
      if (amountIn > beforeTokenBalance) {
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'Token balance is not enough to trade.'
            : '余额不够完成交易。'
        );
        return;
      }
      const contractAddress = contract[chatId][adminAddress].contractAddress;
      await getApprove(
        selectedNetwork[chatId].network,
        contractAddress,
        privateKey
      );

      const decimals = await getToken(
        selectedNetwork[chatId].network,
        contractAddress
      );
      const AmountInBig = fromReadableAmount(amountIn, decimals);
      const wallet = await getWallet(
        selectedNetwork[chatId].network,
        privateKey
      );
      let hash;
      try {
        const tx = await executeSell(
          selectedNetwork[chatId].network,
          contractAddress,
          AmountInBig,
          adminAddress,
          wallet,
          slippage,
          18
        );
        hash = tx.hash;
      } catch (error) {
        console.log(error);
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? '`The gas or slippage settings are insufficient to fulfill this order...`'
            : '`gas或滑点设置不足以完成此订单...`',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      const beforeETHBalance = contract[chatId][adminAddress].ethBalance;

      const afterTokenBalance = await getTokenBalance(
        selectedNetwork[chatId].network,
        contractAddress,
        adminAddress
      );
      const afterETHBalance = await getBalance(
        selectedNetwork[chatId].network,
        adminAddress
      );
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `👛 <b>Wallet Address</b>
      ${adminAddress}\n✉️ <b>Contract Address</b>
      ${contractAddress}\n🌈<b>Transaction Hash:</b>\n${hash}\n\n💰 <b>Before Transaction:</b>
      ETH Balance: ${beforeETHBalance}
      Token Balance: ${beforeTokenBalance}\n💰 <b>After Transaction:</b>
      ETH Balance: ${afterETHBalance}
      Token Balance: ${afterTokenBalance}`
          : `👛 <b>钱包地址</b>
      ${adminAddress}\n✉️ <b>合约地址</b>
      ${contractAddress}\n🌈<b>交易hash:</b>\n${hash}\n\n💰 <b>交易前:</b>
      ETH余额: ${beforeETHBalance}
      代币余额: ${beforeTokenBalance}\n💰 <b>交易后:</b>
      ETH余额: ${afterETHBalance}
      代币余额: ${afterTokenBalance}`,
        { parse_mode: 'HTML' }
      );
      bot.deleteMessage(chatId, actionMessage.message_id);
    } else {
      bot
        .sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'The input format is incorrect.Please click sellNow again'
            : '输入格式不正确，请再次点击“立刻出售”'
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
      selectedNetwork[chatId].language === 'English'
        ? 'Please wait for the state update...'
        : '请等待状态更新。。。'
    );
    const tokenBalance = await getTokenBalance(
      selectedNetwork[chatId].network,
      contractAddress,
      adminAddress
    );
    const decimals = await getToken(
      selectedNetwork[chatId].network,
      contractAddress
    );

    const currentPrice = await getTokenPriceV2(
      selectedNetwork[chatId].network,
      contractAddress,
      decimals
    );
    contract[chatId][adminAddress].tokenBalance = tokenBalance;
    const ethPrice = 1550.0;
    contract[chatId][adminAddress].currentPrice = currentPrice
      ? ethPrice * currentPrice
      : '';
  } else {
    bot
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please set the contract address by clicking on SetContract'
          : '请点击“设置合约”'
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
        }, 5000);
      });
  }

  const ethBalance = await getBalance(
    selectedNetwork[chatId].network,
    adminAddress
  );

  contract[chatId][adminAddress].ethBalance = ethBalance;

  const text = tradeText(chatId, adminAddress);
  try {
    bot.editMessageText(text, {
      parse_mode: 'HTML',
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? keyboardSlice
            : keyboardSliceC,
      },
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
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? keyboardSlice
            : keyboardSliceC,
      },
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
      selectedNetwork[chatId].language === 'English'
        ? 'Please choose to "Import Wallet" or "Generate Wallet"'
        : '请选择导入钱包或者生成钱包'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][1];
    const wallet = await getWallet(selectedNetwork[chatId].network, privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(
      selectedNetwork[chatId].network,
      adminAddress
    );

    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;

    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 1;

    const text =
      selectedNetwork[chatId].language === 'English'
        ? `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n\n`
        : `💼 <b>钱包地址:</b>\n${adminAddress}\n💰<b>ETH余额:</b>\n${ethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? menuWallet
            : menuWalletC,
      },
    });
    if (chatIdformessageId[chatId]?.messageId) {
      bot.deleteMessage(chatId, chatIdformessageId[chatId]?.messageId);
    }
  }
}
async function setWallet2(chatId) {
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }

  if (!privateKeys[chatId].hasOwnProperty(2)) {
    bot.sendMessage(
      chatId,
      selectedNetwork[chatId].language === 'English'
        ? 'Please choose to "Import Wallet" or "Generate Wallet"'
        : '请选择导入钱包或者生成钱包'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][2];
    const wallet = await getWallet(selectedNetwork[chatId].network, privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(
      selectedNetwork[chatId].network,
      adminAddress
    );

    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;

    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 2;
    const text =
      selectedNetwork[chatId].language === 'English'
        ? `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n\n`
        : `💼 <b>钱包地址:</b>\n${adminAddress}\n💰<b>ETH余额:</b>\n${ethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? menuWallet
            : menuWalletC,
      },
    });
    if (chatIdformessageId[chatId]?.messageId) {
      bot.deleteMessage(chatId, chatIdformessageId[chatId]?.messageId);
    }
  }
}
async function setWallet3(chatId) {
  if (!privateKeys[chatId]) {
    privateKeys[chatId] = {};
  }

  if (!privateKeys[chatId].hasOwnProperty(3)) {
    bot.sendMessage(
      chatId,
      selectedNetwork[chatId].language === 'English'
        ? 'Please choose to "Import Wallet" or "Generate Wallet"'
        : '请选择导入钱包或者生成钱包'
    );
    return;
  } else {
    const privateKey = privateKeys[chatId][3];
    const wallet = await getWallet(selectedNetwork[chatId].network, privateKey);
    const adminAddress = await wallet.getAddress();
    const ethBalance = await getBalance(
      selectedNetwork[chatId].network,
      adminAddress
    );

    contract[chatId] ??= {};
    contract[chatId][adminAddress] ??= {};
    contract[chatId][adminAddress].ethBalance = ethBalance;

    contract[chatId][adminAddress].privateKey = privateKey;
    privateKeys[chatId].order = 3;
    const text =
      selectedNetwork[chatId].language === 'English'
        ? `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n\n`
        : `💼 <b>钱包地址:</b>\n${adminAddress}\n💰<b>ETH余额:</b>\n${ethBalance}\n\n`;
    bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? menuWallet
            : menuWalletC,
      },
    });
    if (chatIdformessageId[chatId]?.messageId) {
      bot.deleteMessage(chatId, chatIdformessageId[chatId]?.messageId);
    }
  }
}

async function setRevokeAllCommand(chatId, adminAddress) {
  if (selectedNetwork[chatId].network === 'NEOEVM') {
    setRevokeAllNetwork(mainnetSelectedOptions, chatId, adminAddress);
  } else if (selectedNetwork[chatId].network === 'GOERLI') {
    setRevokeAllNetwork(goerliSelectedOptions, chatId, adminAddress);
  }
}

function setRevokeAllNetwork(selectedOptions, chatId, adminAddress) {
  const chatIdforadminAddress = chatId + '-' + adminAddress;
  try {
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
        selectedNetwork[chatId].language === 'English'
          ? `The trading strategies you uploaded have been cleared.`
          : `线上交易策略已清除`
      );
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'No trading strategies available at the moment.'
          : '当前没有交易策略'
      );
    }
  } catch (e) {
    console.error(e);
  }
}

async function setRevokeCommand(chatId, adminAddress) {
  if (selectedNetwork[chatId].network === 'NEOEVM') {
    setRevokeNetwork(mainnetSelectedOptions, chatId, adminAddress);
  } else if (selectedNetwork[chatId].network === 'GOERLI') {
    setRevokeNetwork(goerliSelectedOptions, chatId, adminAddress);
  }
}

function setRevokeNetwork(selectedOptions, chatId, adminAddress) {
  const chatIdforadminAddress = chatId + '-' + adminAddress;
  try {
    if (selectedOptions[chatIdforadminAddress]) {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter the contract address for the strategy you want to revoke:'
          : '请输入你想清除策略的合约地址'
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
              selectedNetwork[chatId].language === 'English'
                ? `The trading strategies you uploaded have been cleared.`
                : `线上策略已清除`
            );
          } else {
            bot.sendMessage(
              chatId,
              selectedNetwork[chatId].language === 'English'
                ? 'Please enter a valid address.'
                : '请输入有效合约地址'
            );
          }
        } else {
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Please enter a valid address.'
              : '请输入有效合约地址'
          );
        }
      });
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'No trading strategies available at the moment.'
          : '当前没有交易策略'
      );
    }
  } catch (e) {
    console.error(e);
  }
}
async function setCheckCommand(chatId, adminAddress) {
  if (selectedNetwork[chatId].network === 'NEOEVM') {
    setCheckNetwork(mainnetSelectedOptions, chatId, adminAddress);
  } else if (selectedNetwork[chatId].network === 'GOERLI') {
    setCheckNetwork(goerliSelectedOptions, chatId, adminAddress);
  }
}

function setCheckNetwork(selectedOptions, chatId, adminAddress) {
  const chatIdforadminAddress = chatId + '-' + adminAddress;
  try {
    if (selectedOptions[chatIdforadminAddress]) {
      const contractAddresseses = Object.keys(
        selectedOptions[chatIdforadminAddress]
      );
      const strategyText = contractAddresseses
        .map((contractAddress) => {
          const strategies =
            selectedOptions[chatIdforadminAddress][contractAddress].strategy;
          const strategySingle = strategies.map((strategy, index) =>
            selectedNetwork[chatId].language === 'English'
              ? `\n🌟 Trading Strategy ${index + 1}: ${strategy.condition} ${
                  strategy.action
                }\n🌟 Initial Price: ${strategy.origin} USD\n🌟 Base: ${
                  strategy.balance
                }`
              : `\n🌟 交易策略 ${index + 1}: ${strategy.condition} ${
                  strategy.action
                }\n🌟 初始价格: ${strategy.origin} USD\n🌟 基数: ${
                  strategy.balance
                }`
          );
          const contractText =
            selectedNetwork[chatId].language === 'English'
              ? `\nContract Address:\n${contractAddress}`
              : `\n合约地址:\n${contractAddress}`;

          return contractText + strategySingle;
        })
        .join('');

      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? `Wallet Address\n❤️ ${adminAddress}\nStrategy Collection:\n${strategyText}`
          : `钱包地址\n❤️ ${adminAddress}\n策略集合:\n${strategyText}`
      );
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'No trading strategies available at the moment.'
          : '当前没有交易策略'
      );
    }
  } catch (e) {
    console.error(e);
  }
}

async function setSlippage(chatId, messageId, adminAddress) {
  const initialMessage = await bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please enter the slippage, e.g.: 5%'
      : '请输入滑点,例如: 5%'
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
          selectedNetwork[chatId].language === 'English'
            ? 'Incorrect slippage format. Please click "MaxSlippage" again.'
            : '输入格式不正确，请重新点击“最大滑点”'
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
      reply_markup: {
        inline_keyboard:
          selectedNetwork[chatId].language === 'English'
            ? keyboardSlice
            : keyboardSliceC,
      },
    });
  });
}
function tradeText(chatId, adminAddress) {
  const contractAddress = contract[chatId][adminAddress]?.contractAddress || '';
  const ethBalance = contract[chatId][adminAddress]?.ethBalance || '';
  const tokenBalance = contract[chatId][adminAddress]?.tokenBalance || '';
  const currentPrice = contract[chatId][adminAddress]?.currentPrice || '';
  const strategy = contract[chatId][adminAddress]?.strategy || [];
  const doubleBool = contract[chatId][adminAddress]?.doubleBool || false;
  const HalfBool = contract[chatId][adminAddress]?.HalfBool || false;
  const slippage = contract[chatId][adminAddress]?.slippage || '';
  const strategyText = strategy
    .map((item, index) =>
      selectedNetwork[chatId].language === 'English'
        ? `\n🤖️<b>Trading Strategy</b> ${index + 1}:\n    ${item.condition} ${
            item.action
          } \n    Initial Price: ${item.origin} Base: ${item.balance}`
        : `\n🤖️<b>交易策略</b> ${index + 1}:\n    ${item.condition} ${
            item.action
          } \n    初始价格: ${item.origin} 基数: ${item.balance}`
    )
    .join('');
  // const doubleSell = doubleBool
  //   ? '🌟🌟 Double and Sell Half Strategy Added! 🌟🌟\n\n'
  //   : '🌟<b>A:</b> Double and Sell Half\n';
  // const halfSell = HalfBool
  //   ? '🌟🌟 Cut in Half and Sell All Strategy Added! 🌟🌟\n\n'
  //   : '🌟<b>B:</b> Cut in Half and Sell All';
  const slippageText =
    slippage !== ''
      ? selectedNetwork[chatId].language === 'English'
        ? `\n<b>Maximum Slippage:</b> ${slippage}`
        : `\n<b>最大滑点:</b> ${slippage}`
      : '';

  const text =
    selectedNetwork[chatId].language === 'English'
      ? `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n🐶<b>Contract Address:</b>\n${contractAddress}\n📈<b>Current Price:</b> ${currentPrice} USD\n🎫<b>Token Balance:</b> ${tokenBalance}${slippageText}\n${strategyText}\n\n<b>Strategy Setup Order:</b>\n 1️⃣  up|down 2️⃣  X% 3️⃣  buy|sell 4️⃣  X%\n<b>or</b>\n 1️⃣  up|down 2️⃣  custom X% 3️⃣  buy|sell 4️⃣  custom X%\n<b>Example:</b> up 50% sell 10%`
      : `💼 <b>钱包地址:</b>\n${adminAddress}\n💰<b>ETH余额:</b>\n${ethBalance}\n🐶<b>合约地址:</b>\n${contractAddress}\n📈<b>当前价格:</b> ${currentPrice} USD\n🎫<b>代币余额:</b> ${tokenBalance}${slippageText}\n${strategyText}\n\n<b>设置策略顺序:</b>\n 1️⃣  涨|跌 2️⃣  X% 3️⃣  买|卖 4️⃣  X%\n<b>或者</b>\n 1️⃣  涨|跌 2️⃣  自定义 X% 3️⃣  买|卖 4️⃣  自定义 X%\n<b>例如:</b> 涨 50% 卖 10%`;

  return text;
}

async function setHalfSell(chatId, adminAddress) {
  const tokenBalance = Number(contract[chatId][adminAddress].tokenBalance);
  if (tokenBalance == 0) {
    bot
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Cannot set this strategy with a balance of zero'
          : '余额为0不能设置策略'
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
        }, 5000);
      });
    return;
  }
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
  const tokenBalance = Number(contract[chatId][adminAddress].tokenBalance);
  if (tokenBalance == 0) {
    bot
      .sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Cannot set this strategy with a balance of zero'
          : '余额为0不能设置策略'
      )
      .then((sentMessage) => {
        setTimeout(() => {
          bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
        }, 5000);
      });
    return;
  }
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
    selectedNetwork[chatId].language === 'English'
      ? 'Enter the contract address for quantitative trading:'
      : '输入要自定义交易的合约地址:'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      try {
        const waitMessage = await bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'Please wait while the contract is being read...'
            : '请等待正在读取信息。。。'
        );
        // contract[chatId] ??= {};
        // contract[chatId][adminAddress] ??= {};
        const ethPrice = 1550.0;
        // await getETHPrice();

        const tokenBalance = await getTokenBalance(
          selectedNetwork[chatId].network,
          address,
          adminAddress
        );

        const decimals = await getToken(
          selectedNetwork[chatId].network,
          address
        );

        const currentPrice = await getTokenPriceV2(
          selectedNetwork[chatId].network,
          address,
          decimals
        );

        if (!currentPrice) {
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'LP does not exist.'
              : 'LP不存在'
          );
          return;
        }

        contract[chatId][adminAddress].contractAddress = msg.text;
        contract[chatId][adminAddress].tokenBalance = tokenBalance;
        contract[chatId][adminAddress].currentPrice = currentPrice
          ? ethPrice * currentPrice
          : '';
        contract[chatId][adminAddress].doubleBool = false;

        // contract[chatId][adminAddress][contractAddress].selected = [];
        bot.deleteMessage(chatId, waitMessage.message_id);
        bot.deleteMessage(chatId, msg.message_id);
        bot.deleteMessage(chatId, initialMessage.message_id);
        const text = tradeText(chatId, adminAddress);
        bot.editMessageText(text, {
          parse_mode: 'HTML',
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard:
              selectedNetwork[chatId].language === 'English'
                ? keyboardSlice
                : keyboardSliceC,
          },
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address.'
          : '请输入有效地址'
      );
    }
  });
}

async function strategyCommand(chatId, adminAddress) {
  contract[chatId] ??= {};
  contract[chatId][adminAddress] ??= {};
  contract[chatId][adminAddress].ethBalance = await getBalance(
    selectedNetwork[chatId].network,
    adminAddress
  );
  const ethBalance = contract[chatId][adminAddress].ethBalance;

  const text =
    selectedNetwork[chatId].language === 'English'
      ? `💼 <b>Wallet Address:</b>\n${adminAddress}\n💰<b>ETH Balance:</b>\n${ethBalance}\n\n<b>Please set the token contract address for trading first.</b>`
      : `💼 <b>钱包地址:</b>\n${adminAddress}\n💰<b>ETH余额:</b>\n${ethBalance}\n\n<b>请先设置合约地址.</b>`;

  const message = await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard:
        selectedNetwork[chatId].language === 'English' ? keyboard : keyboardC,
    },
  });

  if (chatIdformessageId[chatId]?.messageId) {
    bot.deleteMessage(chatId, chatIdformessageId[chatId]?.messageId);
  }
  chatIdformessageId[chatId] ??= {};
  chatIdformessageId[chatId].messageId = message.message_id;
}

function addressSecurityCommand(chatId) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send the address of the deployment contract you want to check:'
      : '请输入要检测的部署合约的地址'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      addressSecurity(bot, chatId, address, selectedNetwork[chatId].language);
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address:'
          : '请输入有效地址'
      );
    }
  });
}

function tokenSecurityCommand(chatId) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send the contract address you want to check:'
      : '请输入要检测的合约地址'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      tokenSecurity(bot, chatId, address, selectedNetwork[chatId].language);
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address:'
          : '请输入有效地址'
      );
    }
  });
}
function generateWallet(chatId) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId]?.language === 'English'
      ? 'Please send wallet Number,e.g.:1'
      : '请发送钱包序号，例如：1'
  );
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
        selectedNetwork[chatId].language === 'English'
          ? `*Wallet Address:*\n${address}\n*Private Key:*\n${privateKey}\n⚠️ \`Note: We do not store your private key and will not assist with recovery. Please keep it safe.\``
          : `*钱包地址:*\n${address}\n*私钥:*\n${privateKey}\n⚠️ \`注意：我们不会存储您的私钥，也不会协助恢复。请确保将其安全保存。\``,
        { parse_mode: 'Markdown' }
      );
      return;
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter the correct number'
          : '请输入正确的数字'
      );
    }
  });
}

function privatekey(chatId) {
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send your private key and wallet number,e.g.:privatekey 1(Contains spaces)'
      : '请发送你的私钥和钱包序号，例如：私钥 1(注意空格）'
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
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Valid private key has been imported.'
              : '有效私钥已经导入'
          );
        } else {
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Please enter the correct number'
              : '请输入正确的数字'
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'The private key is not of valid length. Please resend!'
            : '私钥长度不正确，请重新点击导入'
        );
      }
    } catch (error) {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'The private key is not of valid length or the wallet number is not correct. Please resend!'
          : '私钥长度或者钱包序号不正确，请重新点击导入'
      );
    }
  });
}

async function check(chatId) {
  const wallets = Object.keys(privateKeys[chatId]);
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  const hasOrder = privateKeys[chatId].hasOwnProperty('order');
  let walletText = '';

  if ((hasOrder && wallets.length > 1) || (!hasOrder && wallets.length > 0)) {
    for (const order of wallets) {
      if (order !== 'order') {
        const privateKey = privateKeys[chatId][order];

        const wallet = await getWallet(
          selectedNetwork[chatId].network,
          privateKey
        );

        const address = wallet.address;
        const balance = await getBalance(
          selectedNetwork[chatId].network,
          address
        );
        walletText +=
          selectedNetwork[chatId].language === 'English'
            ? `💼 <b>Wallet ${order}:</b>\n${address}\n<b>ETH:</b> ${balance}\n\n`
            : `💼 <b>钱包 ${order}:</b>\n${address}\n<b>ETH:</b> ${balance}\n\n`;
      }
    }

    bot.sendMessage(chatId, walletText, { parse_mode: 'HTML' });
  } else {
    walletText =
      selectedNetwork[chatId]?.language === 'English'
        ? `Currently there is no wallet.`
        : '当前没有钱包';
    bot.sendMessage(chatId, walletText, { parse_mode: 'Markdown' });
  }
}

async function sendETH(chatId, privateKey) {
  try {
    const wallet = await getWallet(selectedNetwork[chatId].network, privateKey);
    const adminAddress = await wallet.getAddress();

    bot.sendMessage(
      chatId,
      selectedNetwork[chatId].language === 'English'
        ? 'Please enter the address and amount to send in the format:\n{address} {amount}\nFor example:\n0xdc43b25f3abf65825e52b73441e47f2ce0f9c47d 0.1'
        : '请输入地址和要发送的金额:\n{地址} {金额}\n例如：\n0xdc43b25f3abf65825e52b73441e47f2ce0f9c47d 0.1'
    );

    bot.once('message', async (msg) => {
      const [address, amount] = msg.text.split(' ');
      if (isValidAddress(address)) {
        const balance = await getBalance(
          selectedNetwork[chatId].network,
          adminAddress
        );

        if (balance > amount) {
          const tx = {
            to: address,
            value: ethers.utils.parseEther(amount),
          };
          const receipt = await wallet.sendTransaction(tx);
          await receipt.wait();
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? `Transaction hash: ${receipt.hash}`
              : `交易hash: ${receipt.hash}`
          );
        } else {
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? `The balance of wallet address ${adminAddress} is: ${balance} ETH. Sending is not supported.`
              : `钱包地址 ${adminAddress} 余额为: ${balance} ETH，不足够发送`
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'Please enter a valid address.'
            : '请输入有效地址'
        );
      }
    });
  } catch (e) {
    console.error(e);
  }
}

bot.onText(/\/generatewallet/, (msg) => {
  const chatId = msg.chat.id;
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send wallet Number,e.g.:1'
      : '请发送钱包序号，例如：1'
  );
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
        selectedNetwork[chatId].language === 'English'
          ? `*Wallet Address:*\n${address}\n*Private Key:*\n${privateKey}\n⚠️ \`Note: We do not store your private key and will not assist with recovery. Please keep it safe.\``
          : `*钱包地址:*\n${address}\n*私钥:*\n${privateKey}\n⚠️ \`注意：我们不会存储您的私钥，也不会协助恢复。请确保将其安全保存。\``,
        { parse_mode: 'Markdown' }
      );
      return;
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter the correct number'
          : '请输入正确的数字'
      );
    }
  });
});

bot.onText(/\/privatekey/, (msg) => {
  const chatId = msg.chat.id;
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send your private key and wallet number,e.g.:privatekey 1(Contains spaces)'
      : '请输入私钥和钱包序号，例如：私钥 1(注意空格）'
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
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Valid private key has been imported.'
              : '有效私钥已导入'
          );
        } else {
          bot.sendMessage(
            chatId,
            selectedNetwork[chatId].language === 'English'
              ? 'Please enter the correct number'
              : '请输入正确的数字'
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          selectedNetwork[chatId].language === 'English'
            ? 'The private key is not of valid length. Please resend!'
            : '私钥不是有效长度，请重新点击导入'
        );
      }
    } catch (error) {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'The private key is not of valid length or the wallet number is not correct. Please resend!'
          : '私钥不是有效长度或者钱包数字不正确'
      );
    }
  });
});

bot.onText(/\/addresssecurity/, (msg) => {
  const chatId = msg.chat.id;
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send the address of the deployment contract you want to check:'
      : '请输入要检测的部署合约的地址'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      addressSecurity(bot, chatId, address, selectedNetwork[chatId].language);
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address:'
          : '请输入有效地址'
      );
    }
  });
});

bot.onText(/\/tokensecurity/, (msg) => {
  const chatId = msg.chat.id;
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'NEOEVM';
  bot.sendMessage(
    chatId,
    selectedNetwork[chatId].language === 'English'
      ? 'Please send the contract address you want to check:'
      : '请输入要检测的合约地址'
  );

  bot.once('message', async (msg) => {
    const address = msg.text;
    if (isValidAddress(address)) {
      tokenSecurity(bot, chatId, address, selectedNetwork[chatId].language);
    } else {
      bot.sendMessage(
        chatId,
        selectedNetwork[chatId].language === 'English'
          ? 'Please enter a valid address:'
          : '请输入有效地址'
      );
    }
  });
});
