/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-08-24 17:58:09
 * @Description:
 */
const { ethers } = require('ethers');
const { getBalance, getWallet, setSwap } = require('../helper.js');
let privateKeys = {};
let selectedNetwork = {};
setSwap();
const chatId = 18888888;
privateKeys[chatId] ??= {};
privateKeys[chatId][1] =
  '2fe15ad9c63c47b9ec221de3c3cd1db88ff036077f8dc03a137290373c97f263';
privateKeys[chatId][2] =
  'd3e736c02766c46092582cdbbb1763f6f5ad16c0c00b69957ac73a31377e6dda';
privateKeys[chatId][3] =
  '9d07c4fa755f217ca4321546c8f513a4e03f957a6463977752bdb3703c0b252b';

// const wallets = Object.keys(privateKeys[chatId]);

// let walletText = '';
// wallets.map(async (order) => {
//   const privateKey = privateKeys[chatId][order];
//   const wallet = await getWallet('GOERLI', privateKey);
//   const address = wallet.address;
//   const balance = await getBalance('GOERLI', address);
//   walletText += `Wallet ${order}:\n${address}\nETH: ${balance}\n`;
//   console.log(walletText);
// });

async function check(chatId) {
  const wallets = Object.keys(privateKeys[chatId]);
  selectedNetwork[chatId] ??= {};
  selectedNetwork[chatId].language ??= 'English';
  selectedNetwork[chatId].network ??= 'MAINNET';
  let walletText = '';

  if (wallets.length > 0) {
    for (const order of wallets) {
      const privateKey = privateKeys[chatId][order];

      const wallet = await getWallet(
        selectedNetwork[chatId].network,
        privateKey
      );

      const address = wallet.address;
      const balance = await getBalance('MAINNET', address);
      console.log(balance);
      walletText +=
        selectedNetwork[chatId].language === 'English'
          ? `💼 *Wallet ${order}:*\n${address}\n💶 *ETH:* ${balance}\n\n`
          : `💼 *钱包 ${order}:*\n${address}\n💶 *ETH:* ${balance}\n\n`;
      console.log(walletText);
    }
  } else {
    walletText =
      selectedNetwork[chatId]?.language === 'English'
        ? `Currently there is no wallet.`
        : '当前没有钱包';
  }
}

check(chatId).catch((e) => {
  console.error(e);
});
