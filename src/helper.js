/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-10-14 20:36:17
 * @Description:
 */
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ethers, BigNumber } = require('ethers');
const axios = require('axios');
const { abi: ERC20ABI } = require('../build/ERC20.json');
const { abi: WETHABI } = require('../build/WETH.json');
const { abi: V2FactoryABI } = require('../build/IUniswapV2Factory.json');
const { abi: V2PoolABI } = require('../build/UniswapV2Pair.json');
const { abi: V2RouterABI } = require('../build/IUniswapV2Router02.json');
const { abi: NEOTraderABI } = require('../build/NeoTrader.json');
const PriceFeedABI = require('../build/aggregatorV3InterfaceABI.json');
const { abi: CHECKERABI } = require('../build/TokenChecker.json');

//ethers provider
const provider_main = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_RPL
);
let selectedNetwork = {};
// let provider,
//   WETH,
//   V2FactoryAddress,
//   V2RouterAddress,
//   weth,
//   v2Factory,
//   swapRouterV2;

async function setSwap() {
  selectedNetwork['GOERLI'] ??= {};

  selectedNetwork['GOERLI'].provider = new ethers.providers.JsonRpcProvider(
    process.env.GOERLI_RPC_RPL
  );
  selectedNetwork['GOERLI'].checkerAddress = process.env.GOERLI_CHECKER_ADDRESS;
  selectedNetwork['GOERLI'].WETH = process.env.GOERLI_WETH;
  selectedNetwork['GOERLI'].V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  selectedNetwork['GOERLI'].V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
  selectedNetwork['GOERLI'].checker = new ethers.Contract(
    selectedNetwork['GOERLI'].checkerAddress,
    CHECKERABI,
    selectedNetwork['GOERLI'].provider
  );
  selectedNetwork['GOERLI'].weth = new ethers.Contract(
    selectedNetwork['GOERLI'].WETH,
    WETHABI,
    selectedNetwork['GOERLI'].provider
  );
  selectedNetwork['GOERLI'].v2Factory = new ethers.Contract(
    selectedNetwork['GOERLI'].V2FactoryAddress,
    V2FactoryABI,
    selectedNetwork['GOERLI'].provider
  );
  selectedNetwork['GOERLI'].swapRouterV2 = new ethers.Contract(
    selectedNetwork['GOERLI'].V2RouterAddress,
    V2RouterABI,
    selectedNetwork['GOERLI'].provider
  );
  selectedNetwork['MAINNET'] ??= {};
  selectedNetwork['MAINNET'].provider = new ethers.providers.JsonRpcProvider(
    process.env.MAINNET_RPC_RPL_INFURA
  );
  selectedNetwork['MAINNET'].WETH = process.env.MAINNET_WETH;
  selectedNetwork['MAINNET'].V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  selectedNetwork['MAINNET'].V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
  selectedNetwork['MAINNET'].weth = new ethers.Contract(
    selectedNetwork['MAINNET'].WETH,
    WETHABI,
    selectedNetwork['MAINNET'].provider
  );
  selectedNetwork['MAINNET'].v2Factory = new ethers.Contract(
    selectedNetwork['MAINNET'].V2FactoryAddress,
    V2FactoryABI,
    selectedNetwork['MAINNET'].provider
  );
  selectedNetwork['MAINNET'].swapRouterV2 = new ethers.Contract(
    selectedNetwork['MAINNET'].V2RouterAddress,
    V2RouterABI,
    selectedNetwork['MAINNET'].provider
  );

  selectedNetwork['NEOEVM'] ??= {};
  selectedNetwork['NEOEVM'].checkerAddress = process.env.NEO_CHECKER_ADDRESS;
  selectedNetwork['NEOEVM'].WETH = process.env.WGAS;
  selectedNetwork['NEOEVM'].provider = new ethers.providers.JsonRpcProvider(
    process.env.NEO_RPC_RPL
  );
  selectedNetwork['NEOEVM'].V2FactoryAddress =
    process.env.NEO_FACTORY_ADDRESS_V2;
  selectedNetwork['NEOEVM'].V2RouterAddress = process.env.NEO_ROUTER_ADDRESS_V2;
  selectedNetwork['NEOEVM'].traderAddress = process.env.NEO_TRADER_ADDRESS;
  selectedNetwork['NEOEVM'].checker = new ethers.Contract(
    selectedNetwork['NEOEVM'].checkerAddress,
    CHECKERABI,
    selectedNetwork['NEOEVM'].provider
  );
  selectedNetwork['NEOEVM'].weth = new ethers.Contract(
    selectedNetwork['NEOEVM'].WETH,
    WETHABI,
    selectedNetwork['NEOEVM'].provider
  );
  selectedNetwork['NEOEVM'].v2Factory = new ethers.Contract(
    selectedNetwork['NEOEVM'].V2FactoryAddress,
    V2FactoryABI,
    selectedNetwork['NEOEVM'].provider
  );
  selectedNetwork['NEOEVM'].swapRouterV2 = new ethers.Contract(
    selectedNetwork['NEOEVM'].V2RouterAddress,
    V2RouterABI,
    selectedNetwork['NEOEVM'].provider
  );
  selectedNetwork['NEOEVM'].trader = new ethers.Contract(
    selectedNetwork['NEOEVM'].traderAddress,
    NEOTraderABI,
    selectedNetwork['NEOEVM'].provider
  );
}
// weth provider

//constants
const READABLE_FORM_LEN = 6;
const routerAddressV3 = process.env.ROUTER_ADDRESS;
const MAX_FEE_PER_GAS = 100000000000;
const MAX_PRIORITY_FEE_PER_GAS = 100000000000;
const WETH_decimails = 18;
const multisigAddress = process.env.MULTI_SIG_ADDRESS;

async function getEstimate(network, tokenAddress, adminAddress) {
  if (network === 'MAINNET') {
    const v2Factory = selectedNetwork[network]?.v2Factory;
    const WETH = selectedNetwork[network]?.WETH;
    const v2PoolAddress = await v2Factory.getPair(tokenAddress, WETH);

    const response = await axios.get('https://api.honeypot.is/v2/IsHoneypot', {
      params: {
        address: tokenAddress,
        pair: v2PoolAddress,
      },
    });
    const results = response.data;
    return results;
  } else {
    const results = await contractEstimate(network, tokenAddress, adminAddress);
    return results;
  }
}

async function contractEstimate(network, tokenAddress, adminAddress) {
  const checker = selectedNetwork[network]?.checker;
  const checkerAddress = selectedNetwork[network]?.checkerAddress;
  const provider = selectedNetwork[network]?.provider;
  const calldata = checker.interface.encodeFunctionData('check', [
    tokenAddress,
  ]);
  const transaction = {
    from: adminAddress,
    to: checkerAddress,
    value: ethers.utils.parseEther('0.1'),
    gasLimit: ethers.utils.hexValue(450000),
    data: calldata,
  };
  let result;
  try {
    const simulateResult = await provider.call(transaction);
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'uint256', 'uint256', 'uint256'],
      simulateResult
    );

    const buyExpectedOut = Number(ethers.utils.formatUnits(decoded[0], 18));
    const buyActualOut = Number(ethers.utils.formatUnits(decoded[1], 18));

    const sellExpectedOut = Number(ethers.utils.formatEther(decoded[2]));
    const sellActualOut = Number(ethers.utils.formatUnits(decoded[3], 18));
    const butTax = ((buyExpectedOut - buyActualOut) / buyExpectedOut) * 100;
    const sellTax = ((sellExpectedOut - sellActualOut) / sellExpectedOut) * 100;
    result = {
      honeypotResult: { isHoneypot: 'false' },
      simulationResult: {
        buyTax: butTax.toFixed(2),
        sellTax: sellTax.toFixed(2),
      },
    };
  } catch (e) {
    result = {
      honeypotResult: { isHoneypot: 'true' },
    };
  }

  return result;
}

async function getToken(network, tokenAddress) {
  const provider = selectedNetwork[network].provider;
  const erc20 = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const decimals = await erc20.decimals();
  return decimals;
}

async function getApprove(network, tokenAddress, privateKey) {
  const provider = selectedNetwork[network].provider;
  const V2RouterAddress = selectedNetwork[network].V2RouterAddress;
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
async function getBalance(network, address) {
  const provider = selectedNetwork[network].provider;
  const balanceBN = await provider.getBalance(address);
  const balance = Number(ethers.utils.formatEther(balanceBN)).toFixed(4);
  return balance;
}

async function getTokenBalance(network, tokenAddress, ownerAddress) {
  const provider = selectedNetwork[network].provider;
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
async function getWallet(network, privateKey) {
  const provider = selectedNetwork[network].provider;

  const wallet = new ethers.Wallet(privateKey, provider);

  return wallet;

  //
}

async function getwethDeposit(network, amountIn, privateKey) {
  const provider = selectedNetwork[network].provider;
  const weth = selectedNetwork[network].weth;
  const amountInBIg = ethers.utils.parseEther(amountIn);
  const wallet = new ethers.Wallet(privateKey, provider);

  const wethTx = await weth.connect(wallet).deposit({ value: amountInBIg });

  await wethTx.wait();
}

async function getwethWithdraw(network, amountIn, privateKey) {
  const provider = selectedNetwork[network].provider;
  const weth = selectedNetwork[network].weth;
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

async function transferFee(tax, wallet, multisigAddress) {
  try {
    const tx = {
      to: multisigAddress,
      value: ethers.utils.parseEther(tax),
    };
    const receipt = await wallet.sendTransaction(tx);
    await receipt.wait();
  } catch (e) {
    console.error(6);
  }
}

///v2 swap
async function getTokenPriceV2(network, tokenAddress, decimals) {
  const provider = selectedNetwork[network].provider;
  const v2Factory = selectedNetwork[network].v2Factory;
  const WETH = selectedNetwork[network].WETH;
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
  network,
  token0,
  token1,
  amountIn,
  slippage,
  decimals
) {
  const v2Factory = selectedNetwork[network].v2Factory;
  const provider = selectedNetwork[network].provider;
  const swapRouterV2 = selectedNetwork[network].swapRouterV2;
  const v2PoolAddress = await v2Factory.getPair(token0, token1);
  if (v2PoolAddress != ethers.constants.AddressZero) {
    const v2Pool = new ethers.Contract(v2PoolAddress, V2PoolABI, provider);
    const token = await v2Pool.token0();
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
async function executeBuy(
  network,
  contractAddress,
  amountIn,
  sender,
  wallet,
  slippage,
  decimals
) {
  const WETH = selectedNetwork[network].WETH;
  const swapRouterV2 = selectedNetwork[network].swapRouterV2;
  const trader = selectedNetwork[network].trader;

  const path = [WETH, contractAddress];
  const amountExpectOut = await getAmountExpectOut(
    network,
    WETH,
    contractAddress,
    amountIn,
    slippage,
    decimals
  );

  let gasLimit;

  try {
    if (network === 'NEOEVM') {
      gasLimit = await trader
        .connect(wallet)
        .estimateGas.swapETHForExactTokensV2(
          contractAddress,
          amountIn,
          sender,
          {
            value: amountIn,
          }
        );
    } else {
      gasLimit = await swapRouterV2
        .connect(wallet)
        .estimateGas.swapExactETHForTokensSupportingFeeOnTransferTokens(
          amountExpectOut,
          path,
          sender,
          Math.floor(Date.now() / 1000) + 60 * 5,
          { value: amountIn }
        );
    }
  } catch (err) {
    console.error(err);
    gasLimit = 1000000;
  }
  console.log('Estimated gasLimit:', gasLimit.toString());
  const overOptions = {
    gasLimit: gasLimit,
    value: amountIn,
  };
  let tx;
  if (network === 'NEOEVM') {
    tx = await trader
      .connect(wallet)
      .swapETHForExactTokensV2(contractAddress, amountIn, sender, overOptions);
  } else {
    tx = await swapRouterV2
      .connect(wallet)
      .swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountExpectOut,
        path,
        sender,
        Math.floor(Date.now() / 1000) + 60 * 5,
        overOptions
      );
  }
  await tx.wait(1);
  return tx;
}
async function executeSell(
  network,
  contractAddress,
  amountIn,
  sender,
  wallet,
  slippage,
  decimals
) {
  const WETH = selectedNetwork[network].WETH;
  const swapRouterV2 = selectedNetwork[network].swapRouterV2;
  const trader = selectedNetwork[network].trader;

  const path = [contractAddress, WETH];
  const amountExpectOut = await getAmountExpectOut(
    network,
    contractAddress,
    WETH,
    amountIn,
    slippage,
    decimals
  );

  let gasLimit;

  try {
    if (network === 'NEOEVM') {
      gasLimit = await trader
        .connect(wallet)
        .estimateGas.swapExactTokensForETHV2(contractAddress, amountIn, sender);
    } else {
      gasLimit = await swapRouterV2
        .connect(wallet)
        .estimateGas.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amountIn,
          amountExpectOut,
          path,
          sender,
          Math.floor(Date.now() / 1000) + 60 * 5
        );
    }
  } catch (err) {
    console.error(err);
    gasLimit = 1000000;
  }
  console.log('Estimated gasLimit:', gasLimit.toString());
  const overOptions = {
    gasLimit: gasLimit,
  };
  let tx;
  if (network === 'NEOEVM') {
    tx = await trader
      .connect(wallet)
      .swapExactTokensForETHV2(contractAddress, amountIn, sender, overOptions);
  } else {
    tx = await swapRouterV2
      .connect(wallet)
      .swapExactTokensForETHSupportingFeeOnTransferTokens(
        amountIn,
        amountExpectOut,
        path,
        sender,
        Math.floor(Date.now() / 1000) + 60 * 5,
        overOptions
      );
  }
  await tx.wait(1);
  return tx;
}

async function executeStrategyV2(
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
  language
) {
  console.log(
    `执行用户${chatId}\n合约地址${contractAddress}\n钱包地址${adminAddress}的策略： ${option}`
  );
  console.time('FunctionExecutionTime');
  const beforeTokenBalance = await getTokenBalance(
    network,
    contractAddress,
    adminAddress
  );
  const beforeETHBalance = await getBalance(network, adminAddress);
  let tx;
  const tradeAction = option.action.split(' ')[0];

  const taxFee = await getDiscount(chatId);
  let transferAmount;

  if (tradeAction === 'buy') {
    const amountIn = (Number(option.balance) * actionPercent).toString();

    const afterAmountIn = (amountIn * (1 - taxFee).toFixed(4)).toFixed(4);

    const afterAmountInBig = ethers.utils.parseEther(afterAmountIn.toString());

    tx = await executeBuy(
      network,
      contractAddress,
      afterAmountInBig,
      adminAddress,
      wallet,
      slippage,
      decimals
    );
    transferAmount = (amountIn * taxFee.toFixed(4)).toFixed(8);
  } else {
    const amountIn = (Number(beforeTokenBalance) * actionPercent).toString();
    const amountInBig = fromReadableAmount(amountIn, decimals);

    tx = await executeSell(
      network,
      contractAddress,
      amountInBig,
      adminAddress,
      wallet,
      slippage,
      WETH_decimails
    );

    const afterETHBalance = await getBalance(network, adminAddress);
    transferAmount = (
      (Number(afterETHBalance) - Number(beforeETHBalance)) *
      taxFee.toFixed(4)
    ).toFixed(8);
  }

  const afterETHBalance = await getBalance(network, adminAddress);
  const afterTokenBalance = await getTokenBalance(
    network,
    contractAddress,
    adminAddress
  );

  bot.sendMessage(
    chatId,
    language === 'English'
      ? `👛 <b>Wallet Address</b>
${adminAddress}\n✉️ <b>Contract Address</b>
${contractAddress}\n🎉 <b>Strategy executed:</b> ${option.condition} ${option.action}\n🌈<b>Transaction Hash:</b>\n${tx.hash}\n\n💰 <b>Before Transaction:</b>
    ETH Balance: ${beforeETHBalance}
    Token Balance: ${beforeTokenBalance}\n💰 <b>After Transaction:</b>
    ETH Balance: ${afterETHBalance}
    Token Balance: ${afterTokenBalance}`
      : `👛 <b>钱包地址</b>
    ${adminAddress}\n✉️ <b>合约地址</b>
    ${contractAddress}\n🎉 <b>执行策略:</b> ${option.condition} ${option.action}\n🌈<b>交易Hash:</b>\n${tx.hash}\n\n💰 <b>交易前:</b>
    ETH余额: ${beforeETHBalance}
    代币余额: ${beforeTokenBalance}\n💰 <b>交易后:</b>
    ETH余额: ${afterETHBalance}
    代币余额: ${afterTokenBalance}`,
    { parse_mode: 'HTML' }
  );

  if (taxFee != 0 && afterETHBalance > transferAmount) {
    await transferFee(transferAmount, wallet, multisigAddress);

    console.log(`transfer fee:${transferAmount}`);
  }
  console.timeEnd('FunctionExecutionTime');
}

////////////////////////////////////////////////////////////////

const keyboard = [
  [
    { text: 'setContract', callback_data: 'Contract' },

    { text: 'ClearStrategy', callback_data: 'Clear' },
    { text: 'UpdateState', callback_data: 'Update' },
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
    { text: 'up 100% sell 50%', callback_data: 'Double' },
    { text: 'down 50% sell 100%', callback_data: 'Half' },
  ],
  // 第一行
  [
    { text: 'up', callback_data: 'up' },
    { text: 'down', callback_data: 'down' },
    { text: 'custom', callback_data: 'custom' },
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
const keyboardC = [
  [
    { text: '设置合约', callback_data: 'Contract' },

    { text: '清除策略', callback_data: 'Clear' },
    { text: '更新状态', callback_data: 'Update' },
  ],
  [
    { text: '最大滑点', callback_data: 'Slippage' },
    { text: '模拟交易', callback_data: 'Estimate' },
  ],
  [
    { text: '立刻购买', callback_data: 'buynow' },
    { text: '立刻出售', callback_data: 'sellnow' },
  ],
  [
    { text: '涨 100% 卖 50%', callback_data: 'Double' },
    { text: '跌 50% 卖 100%', callback_data: 'Half' },
  ],
  // 第一行
  [
    { text: '涨', callback_data: 'up' },
    { text: '跌', callback_data: 'down' },
    { text: '自定义', callback_data: 'custom' },
    { text: '买', callback_data: 'buy' },
    { text: '卖', callback_data: 'sell' },
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
  [{ text: '完成', callback_data: 'finish' }],
];
const keyboardSlice = [
  [
    { text: 'ClearStrategy', callback_data: 'Clear' },
    { text: 'UpdateState', callback_data: 'Update' },
    { text: 'MaxSlippage', callback_data: 'Slippage' },
  ],
  [
    { text: 'Estimate', callback_data: 'Estimate' },
    { text: 'buy now', callback_data: 'buynow' },
    { text: 'sell now', callback_data: 'sellnow' },
  ],
  [
    { text: 'up 100% sell 50%', callback_data: 'Double' },
    { text: 'down 50% sell 100%', callback_data: 'Half' },
  ],
  // 第一行
  [
    { text: 'up', callback_data: 'up' },
    { text: 'down', callback_data: 'down' },
    { text: 'custom', callback_data: 'custom' },
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
const keyboardSliceC = [
  [
    { text: '清除策略', callback_data: 'Clear' },
    { text: '更新状态', callback_data: 'Update' },
    { text: '最大滑点', callback_data: 'Slippage' },
  ],
  [
    { text: '模拟交易', callback_data: 'Estimate' },
    { text: '立刻购买', callback_data: 'buynow' },
    { text: '立刻出售', callback_data: 'sellnow' },
  ],
  [
    { text: '涨 100% 卖 50%', callback_data: 'Double' },
    { text: '跌 50% 卖 100%', callback_data: 'Half' },
  ],
  // 第一行
  [
    { text: '涨', callback_data: 'up' },
    { text: '跌', callback_data: 'down' },
    { text: '自定义', callback_data: 'custom' },
    { text: '买', callback_data: 'buy' },
    { text: '卖', callback_data: 'sell' },
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
  [{ text: '完成', callback_data: 'finish' }],
];
const menu = [
  [
    { text: '🇬🇧 ENGLISH', callback_data: 'English' },
    { text: '🇨🇳 CHINESE', callback_data: 'Chinese' },
  ],
  [
    { text: '⚽ NEOEVM', callback_data: 'neoevm' },
    { text: '⚾ Ethereum', callback_data: 'goerli' },
  ],
  [
    { text: '✋ Import Wallet', callback_data: '/privatekey' },
    { text: '🆕 Generate Wallet', callback_data: '/generatewallet' },
    { text: '🔎 Check Wallet', callback_data: '/check' },
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
const menuC = [
  [
    { text: '🇬🇧 英语', callback_data: 'English' },
    { text: '🇨🇳 中文', callback_data: 'Chinese' },
  ],
  [
    { text: '⚽ neo链', callback_data: 'neoevm' },
    { text: '⚾ 以太链', callback_data: 'goerli' },
  ],
  [
    { text: '✋ 导入钱包', callback_data: '/privatekey' },
    { text: '🆕 生成钱包', callback_data: '/generatewallet' },
    { text: '🔎 查看钱包', callback_data: '/check' },
  ],
  [
    { text: '钱包 1⃣️', callback_data: '/wallet1' },
    { text: '钱包 2⃣️', callback_data: '/wallet2' },
    { text: '钱包 3⃣️', callback_data: '/wallet3' },
  ],

  [
    { text: '⚠️ 检测合约', callback_data: '/tokensecurity' },
    { text: '⚠️ 检测部署钱包', callback_data: '/addresssecurity' },
  ],

  [{ text: '💗 推广链接', callback_data: '/Referral' }],
  [{ text: '🔥 查看Gems', url: 't.me/respect_gems_bot?start' }],
];

const menuWallet = [
  [
    { text: '🔥 Trade', callback_data: '/strategy' },
    { text: '📌 Check Honeypot', callback_data: '/honeypot' },
    { text: '🚀 Send ETH', callback_data: '/sendeth' },
  ],

  [
    { text: 'Revoke Strategy', callback_data: 'Revoke' },
    { text: 'Revoke All Strategies', callback_data: 'RevokeAll' },
    { text: 'View Strategies', callback_data: 'Check' },
  ],
];
const menuWalletC = [
  [
    { text: '🔥 交易', callback_data: '/strategy' },
    { text: '📌 查看蜜罐', callback_data: '/honeypot' },
    { text: '🚀 发送ETH', callback_data: '/sendeth' },
  ],

  [
    { text: '清除策略', callback_data: 'Revoke' },
    { text: '清除所有策略', callback_data: 'RevokeAll' },
    { text: '查看策略', callback_data: 'Check' },
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
  executeBuy,
  executeSell,
  executeStrategyV2,
  menuWallet,
  getAmountOut,
  getEstimate,
  getAmountExpectOut,
  setSwap,
  contractEstimate,
  keyboardSlice,
  keyboardC,
  menuC,
  menuWalletC,
  keyboardSliceC,
};
