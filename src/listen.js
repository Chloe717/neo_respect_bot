/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-09-01 13:50:17
 * @Description:
 */
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const { getTokenBalance, getAmountOut, setSwap } = require('./helper.js');
const ethers = require('ethers');
const { abi: factoryABI } = require('../build/IUniswapV2Factory.json');
const { abi: pairABI } = require('../build/UniswapV2Pair.json');
const { abi: ERC20ABI } = require('../build/ERC20.json');

const token = process.env.TOKEN_RESPECT_GEMS;

const bot = new TelegramBot(token, { polling: true });
setSwap();

let provider, WETH, factoryAddress;
// if (process.env.NETWORK === 'MAINNET') {
provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_RPL_INFURA
);

WETH = process.env.MAINNET_WETH;
factoryAddress = process.env.FACTORY_ADDRESS_V2;
// } else if (process.env.NETWORK === 'Shibarium') {
//   WETH = process.env.WBONE;
//   provider = new ethers.providers.JsonRpcProvider(process.env.SHIBA_RPC_RPL);
//   factoryAddress = process.env.SHIBA_FACTORY_ADDRESS_V2;
// }
const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  factory.on('PairCreated', async (token0, token1, pool) => {
    const AMOUNT = 1;
    const ethBalance = await getTokenBalance('MAINNET', WETH, pool);
    const pair = new ethers.Contract(pool, pairABI, provider);
    const [reservesToken0Big, reservesToken1Big, blockTimestampLast] =
      await pair.getReserves();

    const date = new Date(Number(blockTimestampLast) * 1000);
    const dateString = date.toLocaleString();

    let reservesToken0, reservesToken1, name, symbol;
    let token;
    if (token0.toLowerCase() == WETH.toLowerCase()) {
      token = token1;
      reservesToken0 = ethers.utils.formatEther(reservesToken0Big).toString();
      const erc20 = new ethers.Contract(token1, ERC20ABI, provider);
      const decimals = await erc20.decimals();
      name = await erc20.name();
      symbol = await erc20.symbol();
      reservesToken1 = ethers.utils
        .formatUnits(reservesToken1Big, decimals)
        .toString();
    } else {
      token = token0;
      reservesToken0 = ethers.utils.formatEther(reservesToken1Big).toString();
      const erc20 = new ethers.Contract(token0, ERC20ABI, provider);
      const decimals = await erc20.decimals();
      name = await erc20.name();
      symbol = await erc20.symbol();

      reservesToken1 = ethers.utils
        .formatUnits(reservesToken0Big, decimals)
        .toString();
    }
    const price = getAmountOut(AMOUNT, reservesToken1, reservesToken0);

    bot.sendMessage(
      chatId,
      `*${symbol}(${name})*\n*Contract:* ${token}\n*Pool:* ${pool}\n*Initial price:* ${price} ETH\n*CreateTime:* ${dateString}\n*LP Balance:* ${ethBalance} ETH\n`,
      {
        parse_mode: 'Markdown',
      }
    );
  });
});
