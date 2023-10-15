/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-08-25 23:29:52
 * @Description:
 */
const { GoPlus, ErrorCode } = require('goplus-sdk-js');
const axios = require('axios');
const { abi: V2FactoryABI } = require('../build/IUniswapV2Factory.json');
const { ethers, BigNumber } = require('ethers');
require('dotenv').config();

let chainId = '1';
// let addresses = ['0x15c9a0509cf4707eb9add2417d4036e480dc5e84'];
let results = {};
// It will only return 1 result for the 1st token address if not called getAccessToken before

const provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_RPL_INFURA
);
const WETH = process.env.MAINNET_WETH;
const V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
const v2Factory = new ethers.Contract(V2FactoryAddress, V2FactoryABI, provider);

async function tokenSecurity(bot, chatId, address, language) {
  let ret;
  let plusText, honeypotText, totalText;
  try {
    ret = await GoPlus.tokenSecurity(chainId, address);
  } catch (e) {
    console.error(e);
    plusText =
      language === 'English'
        ? `\`Unstable internet connection\``
        : '`网络连接不畅`';
    return;
  }

  results = ret.result[address];
  // console.log(results);
  if (results?.is_open_source !== '1') {
    plusText =
      language === 'English'
        ? `\`The contract is not open source\``
        : '`合约未开源`';
  } else {
    plusText =
      language === 'English'
        ? `
🐶 *${results?.token_name ? results.token_name : 'Unknown'}*(*${
            results?.token_symbol ? results.token_symbol : 'Unknown'
          }*)
🤑 \`Total Supply: ${results?.total_supply ? results.total_supply : 'Unknown'}\`
📈 \`Buy Tax: ${
            results?.buy_tax ? (results.buy_tax * 100).toFixed(2) : 'Unknown'
          }%\`
📉 \`Sell Tax: ${
            results?.sell_tax ? (results.sell_tax * 100).toFixed(2) : 'Unknown'
          }%\`
👨 \`Token Holder Count: ${
            results?.holder_count ? results?.holder_count : 'Unknown'
          }\`
🏊 \`LP Total Supply: ${
            results?.lp_total_supply
              ? Number(results.lp_total_supply).toFixed(2)
              : 'Unknown'
          }\`
🔒 \`LP Locked Holder Ratio: ${
            results?.lp_holders
              ? (
                  results.lp_holders
                    .filter((holder) => holder.is_locked === 1)
                    .reduce(
                      (sum, holder) => sum + parseFloat(holder.percent),
                      0
                    ) * 100
                ).toFixed(2)
              : 'Unknown'
          }%\`
🏠 \`Contract Creator Address: ${
            results?.creator_address ? results.creator_address : 'Unknown'
          }\`
⚠️*Machine test results*⚠️ 
${results?.hidden_owner === '1' ? '`[risk]Hidden Ownership\n`' : ''}${
            results?.can_take_back_ownership === '1'
              ? '`[risk]Can Take Back Ownership\n`'
              : ''
          }${
            results?.is_honeypot === '1' ? '`[risk]Is Honeypot Contract\n`' : ''
          }${
            results?.is_proxy === '1'
              ? '`[prompt]Can modity Contract function\n`'
              : ''
          }${
            results?.selfdestruct === '1' ? '`[prompt]can self destruct\n`' : ''
          }${
            results?.transfer_pausable === '1'
              ? '`[prompt]Trade can Paused\n`'
              : ''
          }${
            results?.trading_cooldown === '1' ? '`[risk]trade cooldown\n`' : ''
          }${results?.is_blacklisted === '1' ? '`[risk]Has Blacklist\n`' : ''}${
            results?.is_whitelisted === '1' ? '`[risk]Whitelisted Trade\n`' : ''
          }${
            results?.slippage_modifiable === '1'
              ? '`[prompt]Trade Tax Modifiable\n`'
              : ''
          }${
            results?.cannot_sell_all === '1'
              ? '`[risk]Restrict All Selling\n`'
              : ''
          }${
            results?.personal_slippage_modifiable === '1'
              ? '`[risk]Can Modify Tax per Address\n`'
              : ''
          }${
            results?.is_anti_whale === '1'
              ? '`[prompt]Restrict Max Trade Amount\n`'
              : ''
          }${
            results?.is_mintable === '1'
              ? '`[prompt]May Incremental Token\n`'
              : ''
          }${
            results?.owner_change_balance === '1'
              ? '`[risk]Can Change Token Balance\n`'
              : ''
          }    
`
        : `
🐶 *${results?.token_name ? results.token_name : '未知'}*(*${
            results?.token_symbol ? results.token_symbol : '未知'
          }*)
🤑 \`总供应量: ${results?.total_supply ? results.total_supply : '未知'}\`
📈 \`买入税: ${
            results?.buy_tax ? (results.buy_tax * 100).toFixed(2) : '未知'
          }%\`
📉 \`卖出税: ${
            results?.sell_tax ? (results.sell_tax * 100).toFixed(2) : '未知'
          }%\`
👨 \`持币人数量: ${results?.holder_count ? results?.holder_count : '未知'}\`
🏊 \`LP总供应量: ${
            results?.lp_total_supply
              ? Number(results.lp_total_supply).toFixed(2)
              : '未知'
          }\`
🔒 \`LP锁仓占比: ${
            results?.lp_holders
              ? (
                  results.lp_holders
                    .filter((holder) => holder.is_locked === 1)
                    .reduce(
                      (sum, holder) => sum + parseFloat(holder.percent),
                      0
                    ) * 100
                ).toFixed(2)
              : '未知'
          }%\`
🏠 \`合约创建地址: ${
            results?.creator_address ? results.creator_address : '未知'
          }\`
⚠️*智能检测结果*⚠️ 
${results?.hidden_owner === '1' ? '`[风险]隐藏所有权\n`' : ''}${
            results?.can_take_back_ownership === '1'
              ? '`[风险]可以找回所有权\n`'
              : ''
          }${results?.is_honeypot === '1' ? '`[风险]疑似蜜罐\n`' : ''}${
            results?.is_proxy === '1' ? '`[提示]可以修改合约\n`' : ''
          }${results?.selfdestruct === '1' ? '`[提示]可以自毁合约\n`' : ''}${
            results?.transfer_pausable === '1' ? '`[提示]可以交易暂停\n`' : ''
          }${
            results?.trading_cooldown === '1' ? '`[提示]有交易冷静期\n`' : ''
          }${results?.is_blacklisted === '1' ? '`[提示]有黑名单\n`' : ''}${
            results?.is_whitelisted === '1' ? '`[提示]有白名单\n`' : ''
          }${
            results?.slippage_modifiable === '1' ? '`[提示]可以修改税\n`' : ''
          }${results?.cannot_sell_all === '1' ? '`[风险]可以限制卖单\n`' : ''}${
            results?.personal_slippage_modifiable === '1'
              ? '`[风险]可以对单地址修改税\n`'
              : ''
          }${
            results?.is_anti_whale === '1'
              ? '`[提示]可以限制最大交易数量\n`'
              : ''
          }${results?.is_mintable === '1' ? '`[风险]可以增发\n`' : ''}${
            results?.owner_change_balance === '1'
              ? '`[风险]可以修改代币余额\n`'
              : ''
          }    
`;
  }

  const v2PoolAddress = await v2Factory.getPair(address, WETH);
  try {
    const response = await axios.get('https://api.honeypot.is/v2/IsHoneypot', {
      params: {
        address: address,
        pair: v2PoolAddress,
      },
    });

    const results = response.data;
    honeypotText =
      language === 'English'
        ? `
🐶 *${results?.token ? results.token.name : 'Unknown'}*(*${
            results?.token ? results.token.symbol : 'Unknown'
          }*)
🍯 \`Is Honypot: ${
            results?.honeypotResult
              ? results.honeypotResult.isHoneypot
              : 'Unknown'
          }\`
📈 \`Buy Tax: ${
            results?.simulationResult
              ? results.simulationResult.buyTax
              : 'Unknown'
          }%\`
📉 \`Sell Tax: ${
            results?.simulationResult
              ? results.simulationResult.sellTax
              : 'Unknown'
          }%\`
🤝 \`Transfer Tax: ${
            results?.simulationResult
              ? results.simulationResult.transferTax
              : 'Unknown'
          }%\`
⛽️ \`Buy Gas: ${
            results?.simulationResult
              ? results.simulationResult.buyGas
              : 'Unknown'
          }\`
⛽️ \`Sell Gas: ${
            results?.simulationResult
              ? results.simulationResult.sellGas
              : 'Unknown'
          }\`
      `
        : `
🐶 *${results?.token ? results.token.name : '未知'}*(*${
            results?.token ? results.token.symbol : '未知'
          }*)
🍯 \`疑似蜜罐: ${
            results?.honeypotResult ? results.honeypotResult.isHoneypot : '未知'
          }\`
📈 \`买入税: ${
            results?.simulationResult ? results.simulationResult.buyTax : '未知'
          }%\`
📉 \`卖出税: ${
            results?.simulationResult
              ? results.simulationResult.sellTax
              : '未知'
          }%\`
🤝 \`转账税: ${
            results?.simulationResult
              ? results.simulationResult.transferTax
              : '未知'
          }%\`
⛽️ \`买入Gas: ${
            results?.simulationResult ? results.simulationResult.buyGas : '未知'
          }\`
⛽️ \`卖出Gas: ${
            results?.simulationResult
              ? results.simulationResult.sellGas
              : '未知'
          }\`
      `;
  } catch (error) {
    honeypotText =
      language === 'English'
        ? `\`Unstable internet connection\``
        : '`网络连接不畅`';
  }
  totalText =
    `*Honypot Source:*` + honeypotText + '\n' + `*Goplus Source:*` + plusText;

  bot.sendMessage(chatId, totalText, {
    parse_mode: 'Markdown',
  });
}
module.exports = {
  tokenSecurity,
};
