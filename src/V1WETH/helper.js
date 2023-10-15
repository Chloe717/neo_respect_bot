/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-08-18 15:48:40
 * @Description:
 */
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ethers, BigNumber } = require('ethers');
const axios = require('axios');
const { abi: ERC20ABI } = require('../../build/ERC20.json');
const { abi: WETHABI } = require('../../build/WETH.json');
const { abi: V2FactoryABI } = require('../../build/IUniswapV2Factory.json');
const { abi: V2PoolABI } = require('../../build/UniswapV2Pair.json');
const { abi: V2RouterABI } = require('../../build/IUniswapV2Router02.json');
const PriceFeedABI = require('../../build/aggregatorV3InterfaceABI.json');

//ethers provider
const provider_main = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_RPL
);
const network = process.env.NETWORK;
let provider,
  WETH,
  V2FactoryAddress,
  V2RouterAddress,
  weth,
  v2Factory,
  swapRouterV2;
if (network === 'MUMBAI') {
  provider = new ethers.providers.JsonRpcProvider(
    process.env.POLYGON_MUMBAI_RPC_RPL
  );

  WETH = process.env.MUMBAI_WETH;
  weth = new ethers.Contract(WETH, WETHABI, provider);
} else if (network === 'GOERLI') {
  provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_RPC_RPL);

  WETH = process.env.GOERLI_WETH;
  V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
  weth = new ethers.Contract(WETH, WETHABI, provider);
  v2Factory = new ethers.Contract(V2FactoryAddress, V2FactoryABI, provider);
  swapRouterV2 = new ethers.Contract(V2RouterAddress, V2RouterABI, provider);
} else if (process.env.NETWORK === 'MAINNET') {
  provider = new ethers.providers.JsonRpcProvider(
    process.env.MAINNET_RPC_RPL_INFURA
  );
  WETH = process.env.MAINNET_WETH;
  V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
  weth = new ethers.Contract(WETH, WETHABI, provider);
  v2Factory = new ethers.Contract(V2FactoryAddress, V2FactoryABI, provider);
  swapRouterV2 = new ethers.Contract(V2RouterAddress, V2RouterABI, provider);
} else if (network === 'Shibarium') {
  WETH = process.env.WBONE;
  provider = new ethers.providers.JsonRpcProvider(process.env.SHIBA_RPC_RPL);
  V2FactoryAddress = process.env.SHIBA_FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.SHIBA_ROUTER_ADDRESS_V2;
  weth = new ethers.Contract(WETH, WETHABI, provider);
  v2Factory = new ethers.Contract(V2FactoryAddress, V2FactoryABI, provider);
  swapRouterV2 = new ethers.Contract(V2RouterAddress, V2RouterABI, provider);
}

// weth provider

//constants
const READABLE_FORM_LEN = 6;
const routerAddressV3 = process.env.ROUTER_ADDRESS;
const MAX_FEE_PER_GAS = 100000000000;
const MAX_PRIORITY_FEE_PER_GAS = 100000000000;
const WETH_decimails = 18;
const multisigAddress = process.env.MULTI_SIG_ADDRESS;

async function getEstimate(tokenAddress) {
  const v2PoolAddress = await v2Factory.getPair(tokenAddress, WETH);

  const response = await axios.get('https://api.honeypot.is/v2/IsHoneypot', {
    params: {
      address: tokenAddress,
      pair: v2PoolAddress,
    },
  });
  const results = response.data;
  return results;
}

async function getToken(tokenAddress) {
  const erc20 = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const decimals = await erc20.decimals();
  return decimals;
}

async function getApprove(tokenAddress, privateKey) {
  const erc20 = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const wallet = new ethers.Wallet(privateKey, provider);
  const ownerAddress = wallet.address;
  const allownAmountBig = await erc20.allowance(ownerAddress, V2RouterAddress);
  const allownAmount = Number(ethers.utils.formatEther(allownAmountBig));

  if (allownAmount === 0) {
    const tx = await erc20
      .connect(wallet)
      .approve(V2RouterAddress, ethers.constants.MaxUint256);
    await tx.wait(1);
  }
}
//auto router
function fromReadableAmount(amount, decimals) {
  return ethers.utils.parseUnits(amount.toString(), decimals);
}

function isValidPrivateKey(privateKey) {
  if (/^(0x[a-fA-F0-9]{64})$|^([a-fA-F0-9]{64})$/.test(privateKey)) {
    return true;
  } else {
    return false;
  }
}
function isValidAddress(address) {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return true;
  } else {
    return false;
  }
}
async function getBalance(address) {
  const balanceBN = await provider.getBalance(address);
  const balance = Number(ethers.utils.formatEther(balanceBN)).toFixed(4);
  return balance;
}

async function getTokenBalance(tokenAddress, ownerAddress) {
  try {
    const erc20 = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const decimals = await erc20.decimals();
    const balanceBN = await erc20.balanceOf(ownerAddress);
    const balance = Number(
      ethers.utils.formatUnits(balanceBN, decimals)
    ).toFixed(4);
    return balance;
  } catch (e) {
    console.log(e);
    return;
  }
}
async function getWallet(privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);

  return wallet;

  //
}

async function getwethDeposit(amountIn, privateKey) {
  const amountInBIg = ethers.utils.parseEther(amountIn);
  const wallet = new ethers.Wallet(privateKey, provider);

  const wethTx = await weth.connect(wallet).deposit({ value: amountInBIg });

  await wethTx.wait();
}

async function getwethWithdraw(amountIn, privateKey) {
  const amountInBIg = ethers.utils.parseEther(amountIn);
  const wallet = new ethers.Wallet(privateKey, provider);
  const wethTx = await weth.connect(wallet).withdraw(amountInBIg);
  await wethTx.wait();
}

function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return wallet;
}

async function getETHPrice() {
  const priceFeed = new ethers.Contract(
    process.env.ETH_USD,
    PriceFeedABI,
    provider_main
  );
  let roundData = await priceFeed.latestRoundData();
  let decimals = await priceFeed.decimals();
  let ethPrice = Number(
    (roundData.answer.toString() / Math.pow(10, decimals)).toFixed(2)
  );
  return ethPrice;
}

//mongodb
const uri = process.env.MONGODB_URI;

let isClientOpen = false;
async function connectClient() {
  try {
    if (!isClientOpen) {
      await client.connect();
      console.log('MongoDB connected.');
      isClientOpen = true;
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the application on connection failure
  }
}

// Close the client connection when the application is shutting down
async function closeClient() {
  try {
    if (isClientOpen) {
      await client.close();
      console.log('MongoDB connection closed.');
      isClientOpen = false;
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

async function connectMongodb(selectedOptions) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  const dbName = 'meme';
  const collectionName = 'strategy';
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 插入 selectedOptions 数据到集合中
    // 使用 Object.keys() 方法来获取 selectedOptions 对象中的键
    const chatIdforadminAddresses = Object.keys(selectedOptions);

    // // 遍历 chatIds 数组，依次进行插入/替换操作
    for (const chatIdforadminAddress of chatIdforadminAddresses) {
      const [chatId, adminAddress] = chatIdforadminAddress.split('-');
      const addresses = Object.keys(selectedOptions[chatIdforadminAddress]);

      for (const address of addresses) {
        //完全一致则不更新
        const filter = {
          [chatIdforadminAddress]: {
            [address]: selectedOptions[chatIdforadminAddress][address],
          },
        };
        const options = { upsert: true };
        await collection.updateOne(
          filter,
          {
            $set: {
              [chatIdforadminAddress]: selectedOptions[chatId],
            },
          },
          options
        );
        console.log(
          `成功插入/替换数据到 MongoDB，chatId: ${chatId}, adminAddress: ${adminAddress}, address: ${address}`
        );
      }
    }
  } catch (error) {
    console.error(1);
  } finally {
    // Ensures that the client will close when you finish/error
    client.close();
  }
}
async function uploadInviteUsers(newChatId, inviter, discount) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  const dbName = 'meme';
  // discount===false说明还没有交易过
  const collectionName = 'InviteUsers';
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.updateOne(
      { chatId: newChatId.toString() },
      { $set: { inviter: inviter.toString(), discount: discount } },
      { upsert: true }
    );
  } catch (error) {
    console.error(2);
  } finally {
    // Ensures that the client will close when you finish/error
    client.close();
  }
}

async function uploadInviterDiscount(inviter, inviteCount) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  const dbName = 'meme';
  const collectionName = 'InviteDiscount';

  try {
    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    // connection = await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.updateOne(
      { chatId: inviter.toString() },
      { $set: { inviteCount: inviteCount } },
      { upsert: true }
    );
  } catch (error) {
    console.error(3);
  } finally {
    // Ensures that the client will close when you finish/error
    client.close();
  }
}

async function findInviteInfo(chatId, collectionName) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  const dbName = 'meme';
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const inviteCount = await collection.findOne({ chatId: chatId.toString() });

    return inviteCount;
  } catch (error) {
    console.error(3);
  } finally {
    // Ensures that the client will close when you finish/error
    client.close();
  }
}

async function getDiscount(chatId) {
  try {
    let taxFee = 0.01;

    const inviterCount = await findInviteInfo(chatId, 'InviteDiscount');
    const inviteUsers = await findInviteInfo(chatId, 'InviteUsers');
    console.log(inviterCount);

    if (inviteUsers && inviteUsers.discount === false) {
      taxFee = 0;
      return taxFee;
    }
    if (inviterCount) {
      if (inviterCount.inviteCount >= 10) {
        taxFee *= 0.5;
      } else if (inviterCount.inviteCount >= 5) {
        taxFee *= 0.7;
      } else if (inviterCount.inviteCount >= 1) {
        taxFee *= 0.9;
      } else if (inviterCount.inviteCount === -1) {
        taxFee = 0;
      }
    }
    console.log(taxFee);
    return taxFee;
  } catch (e) {
    console.error(5);
  }
}

async function transferFee(amount, taxFee, wallet, multisigAddress, decimals) {
  try {
    if (taxFee !== 0) {
      const tax = (amount * taxFee).toFixed(8);

      const txWeth = await weth
        .connect(wallet)
        .transfer(
          multisigAddress,
          fromReadableAmount(tax, decimals).toString()
        );
      await txWeth.wait(1);
    }
  } catch (e) {
    console.error(6);
  }
}

///v2 swap
async function getTokenPriceV2(tokenAddress, decimals) {
  let price;
  const AMOUNT = 1;
  const v2PoolAddress = await v2Factory.getPair(tokenAddress, WETH);
  if (v2PoolAddress != ethers.constants.AddressZero) {
    const v2Pool = new ethers.Contract(v2PoolAddress, V2PoolABI, provider);
    const token0 = await v2Pool.token0();

    const [reservesToken0Big, reservesToken1Big] = await v2Pool.getReserves();
    let reservesToken0, reservesToken1;
    if (token0.toLowerCase() == WETH.toLowerCase()) {
      reservesToken0 = ethers.utils.formatEther(reservesToken0Big).toString();

      reservesToken1 = ethers.utils
        .formatUnits(reservesToken1Big, decimals)
        .toString();
    } else {
      reservesToken0 = ethers.utils.formatEther(reservesToken1Big).toString();

      reservesToken1 = ethers.utils
        .formatUnits(reservesToken0Big, decimals)
        .toString();
    }
    price = getAmountOut(AMOUNT, reservesToken1, reservesToken0);
  }

  return price;
}

function getAmountOut(amountIn, reserveToken0, reserveToken1) {
  const amountInWithFee = amountIn * 997;
  const numerator = amountInWithFee * reserveToken1;
  const denominator = reserveToken0 * 1000 + amountInWithFee;
  const amountOut = numerator / denominator;
  return amountOut;
}
async function getAmountExpectOut(
  token0,
  token1,
  amountIn,
  slippage,
  decimals
) {
  const v2PoolAddress = await v2Factory.getPair(token0, token1);
  if (v2PoolAddress != ethers.constants.AddressZero) {
    const v2Pool = new ethers.Contract(v2PoolAddress, V2PoolABI, provider);
    const token = await v2Pool.token0();
    console.log(token);

    const [reservesToken0Big, reservesToken1Big] = await v2Pool.getReserves();
    let AmountOutBig;
    if (token.toLowerCase() == token1.toLowerCase()) {
      AmountOutBig = await swapRouterV2.getAmountOut(
        amountIn,
        reservesToken1Big,
        reservesToken0Big
      );
    } else {
      AmountOutBig = await swapRouterV2.getAmountOut(
        amountIn,
        reservesToken0Big,
        reservesToken1Big
      );
    }

    const amountOut = ethers.utils.formatUnits(AmountOutBig, decimals);
    console.log('amountOut', amountOut);
    const amountOutExpected = Number(amountOut) * (1 - slippage);
    console.log(amountOutExpected, 'amountOutExpected');
    const amountOutExpectedBig = fromReadableAmount(
      amountOutExpected,
      decimals
    );
    return amountOutExpectedBig;
  }
}
async function executeRouteV2(
  token0,
  token1,
  amountIn,
  sender,
  wallet,
  slippage,
  decimals
) {
  const path = [token0, token1];
  const amountExpectOut = await getAmountExpectOut(
    token0,
    token1,
    amountIn,
    slippage,
    decimals
  );

  let gasLimit;

  try {
    gasLimit = await swapRouterV2
      .connect(wallet)
      .estimateGas.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        amountExpectOut,
        path,
        sender,
        Math.floor(Date.now() / 1000) + 60 * 5
      );
  } catch (err) {
    console.error(err);
    gasLimit = 1000000;
  }
  console.log('Estimated gasLimit:', gasLimit.toString());
  const overOptions = {
    gasLimit: gasLimit,
  };
  const tx = await swapRouterV2
    .connect(wallet)
    .swapExactTokensForTokensSupportingFeeOnTransferTokens(
      amountIn,
      amountExpectOut,
      path,
      sender,
      Math.floor(Date.now() / 1000) + 60 * 5,
      overOptions
    );
  await tx.wait(1);
  return tx;
}

async function executeStrategyV2(
  chatId,
  actionPercent,
  WETH,
  contractAddress,
  adminAddress,
  option,
  bot,
  decimals,
  contractAddress,
  wallet,
  slippage
) {
  console.log(
    `执行用户${chatId}\n合约地址${contractAddress}\n钱包地址${adminAddress}的策略： ${option}`
  );
  console.time('FunctionExecutionTime');
  const beforetokenBalance = await getTokenBalance(
    contractAddress,
    adminAddress
  );
  const beforewethBalance = await getTokenBalance(WETH, adminAddress);
  let tx, amountOut;
  const tradeAction = option.action.split(' ')[0];

  const taxFee = await getDiscount(chatId);

  if (tradeAction === 'buy') {
    if (beforewethBalance != 0) {
      const amountIn = (Number(option.balance) * actionPercent).toString();

      const afterAmountIn = (amountIn * (1 - taxFee)).toFixed(8);
      console.log(afterAmountIn);
      const afterAmountInBig = fromReadableAmount(
        afterAmountIn,
        WETH_decimails
      );
      tx = await executeRouteV2(
        WETH,
        contractAddress,
        afterAmountInBig,
        adminAddress,
        wallet,
        slippage,
        WETH_decimails
      );
      const aftertokenBalance = await getTokenBalance(
        contractAddress,
        adminAddress
      );
      const afterwethBalance = await getTokenBalance(WETH, adminAddress);
      bot.sendMessage(
        chatId,
        `👛 <b>Wallet Address</b>
    ${adminAddress}\n✉️ <b>Contract Address</b>
    ${contractAddress}\n🎉 <b>Strategy executed:</b> ${option.condition} ${option.action}\n🌈<b>Transaction Hash:</b>\n${tx.hash}\n\n💰 <b>Before Transaction:</b>
    WETH Balance: ${beforewethBalance}
    Token Balance: ${beforetokenBalance}\n💰 <b>After Transaction:</b>
    WETH Balance: ${afterwethBalance}
    Token Balance: ${aftertokenBalance}`,
        { parse_mode: 'HTML' }
      );

      console.log(tx.hash);
      if (taxFee != 0) {
        await transferFee(
          amountIn,
          taxFee,
          wallet,
          multisigAddress,
          WETH_decimails
        );

        console.log(`transfer fee:${amountIn}`);
      }
    }
  } else {
    if (beforetokenBalance != 0) {
      const amountIn = (Number(beforetokenBalance) * actionPercent).toString();
      const amountInBig = fromReadableAmount(amountIn, decimals);

      tx = await executeRouteV2(
        contractAddress,
        WETH,
        amountInBig,
        adminAddress,
        wallet,
        slippage,
        decimals
      );
      const aftertokenBalance = await getTokenBalance(
        contractAddress,
        adminAddress
      );
      const afterwethBalance = await getTokenBalance(WETH, adminAddress);
      bot.sendMessage(
        chatId,
        `👛 <b>Wallet Address</b>
    ${adminAddress}\n✉️ <b>Contract Address</b>
    ${contractAddress}\n🎉 <b>Strategy executed:</b> ${option.condition} ${option.action}\n🌈<b>Transaction Hash:</b>\n${tx.hash}\n\n💰 <b>Before Transaction:</b>
    WETH Balance: ${beforewethBalance}
    Token Balance: ${beforetokenBalance}\n💰 <b>After Transaction:</b>
    WETH Balance: ${afterwethBalance}
    Token Balance: ${aftertokenBalance}`,
        { parse_mode: 'HTML' }
      );
      console.log(tx.hash);

      amountOut = (
        Number(afterwethBalance) - Number(beforewethBalance)
      ).toFixed(10);
      if (taxFee != 0) {
        await transferFee(amountOut, taxFee, wallet, multisigAddress, decimals);

        console.log(`transfer fee:${amountOut}`);
      }
    }
  }
  console.timeEnd('FunctionExecutionTime');
}

////////////////////////////////////////////////////////////////

const keyboard = [
  [
    { text: 'setContract', callback_data: 'Contract' },

    { text: 'ClearStrategy', callback_data: 'Clear' },
    { text: 'UpdatePrice', callback_data: 'Update' },
  ],
  [
    { text: 'MaxSlippage', callback_data: 'Slippage' },
    { text: 'Estimate', callback_data: 'Estimate' },
  ],
  [
    { text: 'buy now', callback_data: 'buynow' },
    { text: 'sell now', callback_data: 'sellnow' },
  ],
  [
    { text: 'A', callback_data: 'Double' },
    { text: 'B', callback_data: 'Half' },
    { text: 'A+B', callback_data: 'AB' },
  ],
  // 第一行
  [
    { text: 'up', callback_data: 'up' },
    { text: 'down', callback_data: 'down' },
  ],
  [
    { text: 'buy', callback_data: 'buy' },
    { text: 'sell', callback_data: 'sell' },
  ],
  // 第二行
  [
    { text: '10%', callback_data: '10%' },

    { text: '30%', callback_data: '30%' },

    { text: '50%', callback_data: '50%' },

    { text: '70%', callback_data: '70%' },

    { text: '100%', callback_data: '100%' },
  ],
  [
    { text: '200%', callback_data: '200%' },
    { text: '300%', callback_data: '300%' },
    { text: '500%', callback_data: '500%' },
    { text: '700%', callback_data: '500%' },
    { text: '1000%', callback_data: '1000%' },
  ],
  // 第三行
  [
    { text: '2000%', callback_data: '2000%' },
    { text: '3000%', callback_data: '3000%' },
    { text: '5000%', callback_data: '5000%' },
    { text: '7000%', callback_data: '2000%' },
    { text: '10000%', callback_data: '10000%' },
  ],
  [{ text: 'finish', callback_data: 'finish' }],
];

const menu = [
  [
    { text: '✋ Import Wallet', callback_data: '/privatekey' },
    { text: '🆕 Generate Wallet', callback_data: '/generatewallet' },
  ],
  [
    { text: 'Wallet 1⃣️', callback_data: '/wallet1' },
    { text: 'Wallet 2⃣️', callback_data: '/wallet2' },
    { text: 'Wallet 3⃣️', callback_data: '/wallet3' },
  ],

  [
    { text: '⚠️ Check Token Contract', callback_data: '/tokensecurity' },
    { text: '⚠️ Check Deployment Contract', callback_data: '/addresssecurity' },
  ],

  [{ text: '💗 Referral Program', callback_data: '/Referral' }],
  [{ text: '🔥 Look Gems', url: 't.me/respect_gems_bot?start' }],
];

const menuWallet = [
  [
    { text: '🔥 Trade', callback_data: '/strategy' },
    { text: '🚀 Send ETH', callback_data: '/sendeth' },
  ],

  [
    { text: 'Revoke Strategy', callback_data: 'Revoke' },
    { text: 'Revoke All Strategies', callback_data: 'RevokeAll' },
    { text: 'View Strategies', callback_data: 'Check' },
  ],
];
module.exports = {
  isValidPrivateKey,
  isValidAddress,
  getBalance,
  getWallet,
  generateWallet,
  getTokenBalance,
  getApprove,
  getwethDeposit,
  getwethWithdraw,
  connectMongodb,
  keyboard,
  getETHPrice,
  getToken,
  menu,
  findInviteInfo,
  uploadInviterDiscount,
  uploadInviteUsers,
  transferFee,
  getDiscount,
  fromReadableAmount,
  connectClient,
  closeClient,
  getTokenPriceV2,
  executeRouteV2,
  executeStrategyV2,
  menuWallet,
  getAmountOut,
  getEstimate,
  getAmountExpectOut,
};
