/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-08-24 16:37:14
 * @Description:
 */
require('dotenv').config();
const { ethers, BigNumber } = require('ethers');
const {
  getETHPrice,
  getToken,
  uploadInviteUsers,
  uploadInviterDiscount,
  findInviteInfo,
  executeStrategyV2,
  getTokenPriceV2,
  getWallet,
} = require('./helper.js');

////////////////////////////////////////////////////////////////////////
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 遍历用户策略并执行符合条件的第一个策略
async function processUserStrategies(
  bot,
  strategy,
  privateKeysforAddress,
  network,
  selectedNetwork
) {
  console.log(network, '开始扫描:');

  try {
    const chatIdforadminAddresses = Object.keys(strategy);

    const retArr = chatIdforadminAddresses.map(
      async (chatIdforadminAddress) => {
        //循环按地址而不是chatid
        const [chatId, adminAddress] = chatIdforadminAddress.split('-');
        let newUserBool = false;
        const contractAddresseses = Object.keys(
          strategy[chatIdforadminAddress]
        );

        let privateKey;
        if (privateKeysforAddress[chatId][adminAddress]) {
          privateKey = privateKeysforAddress[chatId][adminAddress];
        } else {
          return;
        }

        const wallet = await getWallet(network, privateKey);

        for (const contractAddress of contractAddresseses) {
          let options =
            strategy[chatIdforadminAddress][contractAddress].strategy;

          if (!Array.isArray(options)) {
            options = [options];
          }
          const decimals = await getToken(network, contractAddress);

          const currentPriceforETH = await getTokenPriceV2(
            network,
            contractAddress,
            decimals
          );

          let updatedStrategies = [];
          if (options.length === 0) {
            delete strategy[chatIdforadminAddress][contractAddress];

            if (Object.keys(strategy[chatIdforadminAddress]).length === 0) {
              // Delete the property
              delete strategy[chatIdforadminAddress];
            }
            return;
          }
          if (strategy[chatIdforadminAddress]?.[contractAddress]?.change) {
            strategy[chatIdforadminAddress][contractAddress].change = false;
          } else {
            for (const option of options) {
              console.log(option);

              //检测余额够不够
              // const ethBalance = await getBalance(adminAddress);

              const [operation, percentageStr] = option.condition.split(' ');
              let targetPercent = parseInt(percentageStr, 10) / 100;
              targetPercent =
                operation === 'up' ? targetPercent + 1 : 1 - targetPercent;

              //原始价格

              const originPrice = Number(option.origin);
              //当前价格
              const ethPrice = await getETHPrice();
              const currentPrice = currentPriceforETH * ethPrice;
              //目标价格
              const targetUpPrice = originPrice * (targetPercent + 0.02);
              const targetDownPrice = originPrice * (targetPercent - 0.02);
              console.log('当前价格:', currentPrice);
              console.log('初始价格:', originPrice);
              console.log(
                '可以执行的价格范围:',
                targetDownPrice,
                '-',
                targetUpPrice
              );
              //交易百分比
              const [tradeAction, actionPercentStr] = option.action.split(' ');
              const actionPercent = parseInt(actionPercentStr, 10) / 100;

              const slippage = parseFloat(option.slippage) / 100;

              if (
                (targetPercent > 1 &&
                  Number(currentPrice) > Number(targetDownPrice)) ||
                (targetPercent < 1 &&
                  Number(currentPrice) < Number(targetUpPrice))
              ) {
                // 执行策略
                try {
                  await executeStrategyV2(
                    chatId,
                    network,
                    actionPercent,
                    contractAddress,
                    adminAddress,
                    option,
                    bot,
                    decimals,
                    contractAddress,
                    wallet,
                    slippage,
                    selectedNetwork[chatId].language
                  );
                  newUserBool = true;
                } catch (e) {
                  console.error(e);
                  // updatedStrategies.push(option);
                  bot.sendMessage(
                    chatId,
                    selectedNetwork[chatId].language === 'Englis'
                      ? '`The gas or slippage settings are insufficient to fulfill this order...`'
                      : 'gas或滑点设置不足以完成此订单...',
                    { parse_mode: 'Markdown' }
                  );
                }
                try {
                  const inviteUsers = await findInviteInfo(
                    chatId,
                    'InviteUsers'
                  );
                  if (inviteUsers && inviteUsers.discount === false) {
                    const inviterCount = await findInviteInfo(
                      inviteUsers.inviter,
                      'InviteDiscount'
                    );
                    if (inviterCount !== null) {
                      await uploadInviterDiscount(
                        inviteUsers.inviter,
                        inviterCount.inviteCount + 1
                      );
                    } else {
                      await uploadInviterDiscount(inviteUsers.inviter, 1);
                    }
                    if (newUserBool && inviteUsers.discount === false) {
                      await uploadInviteUsers(
                        chatId,
                        inviteUsers.inviter,
                        true
                      );
                    }
                  }
                } catch (err) {
                  console.error(err);
                }
              } else {
                // 将未满足条件的策略放回updatedStrategies中
                updatedStrategies.push(option);
              }
              // console.log(updatedStrategies);
            }
            if (strategy[chatIdforadminAddress]) {
              strategy[chatIdforadminAddress][contractAddress].strategy =
                updatedStrategies;
            }
          }
        }
      }
    );
    await Promise.all(retArr);
  } catch (err) {
    console.error(err);
  }

  setTimeout(
    () =>
      processUserStrategies(
        bot,
        strategy,
        privateKeysforAddress,
        network,
        selectedNetwork
      ),
    10000
  );
}

// 启动定时执行

module.exports = {
  processUserStrategies,
};
