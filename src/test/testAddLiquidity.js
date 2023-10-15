/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-10-14 16:39:56
 * @Description:
 */
const { ethers, BigNumber } = require('ethers');
require('dotenv').config();
const { abi: V2RouterABI } = require('../../build/IUniswapV2Router02.json');
const { abi: V2PoolABI } = require('../../build/UniswapV2Pair.json');
const { abi: V2FactoryABI } = require('../../build/IUniswapV2Factory.json');
const { abi: ERC20ABI } = require('../../build/ERC20.json');

const network = process.env.NETWORK;
let provider, WETH, V2FactoryAddress, V2RouterAddress;
if (network === 'MUMBAI') {
  provider = new ethers.providers.JsonRpcProvider(
    process.env.POLYGON_MUMBAI_RPC_RPL
  );

  WETH = process.env.MUMBAI_WETH;
} else if (network === 'GOERLI') {
  provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_RPC_RPL);

  WETH = process.env.GOERLI_WETH;
  V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
} else if (process.env.NETWORK === 'MAINNET') {
  provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_RPL);
  WETH = process.env.MAINNET_WETH;
  V2FactoryAddress = process.env.FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.ROUTER_ADDRESS_V2;
} else if (process.env.NETWORK === 'NEOEVM') {
  provider = new ethers.providers.JsonRpcProvider(process.env.NEOEVM_RPC_URL);
  WETH = process.env.WGAS;
  V2FactoryAddress = process.env.NEO_FACTORY_ADDRESS_V2;
  V2RouterAddress = process.env.NEO_ROUTER_ADDRESS_V2;
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const swapRouterV2 = new ethers.Contract(
  V2RouterAddress,
  V2RouterABI,
  provider
);
const v2Factory = new ethers.Contract(V2FactoryAddress, V2FactoryABI, provider);

const tokenAddress = '0x6aE9426a6356b383E32a1604C575A24cAd432826';
// '0xdc5e9445169c73cf21e1da0b270e8433cac69959';

async function addLiquidityETH() {
  const amountTokenDesired = ethers.utils.parseEther('300');

  const amountTokenMin = ethers.utils.parseEther('300');
  const amountETHMin = ethers.utils.parseEther('2.9');
  const to = wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 5;

  const overrides = {
    value: ethers.utils.parseEther('3'),
    gasLimit: 3000000,
    gasPrice: ethers.utils.parseUnits('30', 'gwei'),
  };

  const tx = await swapRouterV2
    .connect(wallet)
    .addLiquidityETH(
      tokenAddress,
      amountTokenDesired,
      amountTokenMin,
      amountETHMin,
      to,
      deadline,
      overrides
    );

  console.log('Transaction hash:', tx.hash);

  await tx.wait();

  console.log('Transaction confirmed');
}

async function addLiquidity() {
  const amountTokenDesired = ethers.utils.parseEther('300');
  const amountWETHDesired = ethers.utils.parseEther('3');
  const amountTokenMin = ethers.utils.parseEther('0');
  const amountETHMin = ethers.utils.parseEther('0');
  const to = wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 5;

  const overrides = {
    gasLimit: 3000000,
    gasPrice: ethers.utils.parseUnits('30', 'gwei'),
  };

  const tx = await swapRouterV2
    .connect(wallet)
    .addLiquidity(
      WETH,
      tokenAddress,
      amountWETHDesired,
      amountTokenDesired,
      amountETHMin,
      amountTokenMin,
      to,
      deadline,
      overrides
    );

  console.log('Transaction hash:', tx.hash);

  await tx.wait();

  console.log('Transaction confirmed');
}

async function getLiquidityStatus() {
  const v2PoolAddress = await v2Factory.getPair(tokenAddress, WETH);
  if (v2PoolAddress != ethers.constants.AddressZero) {
    const v2Pool = new ethers.Contract(v2PoolAddress, V2PoolABI, provider);

    const [reservesToken0Big, reservesToken1Big] = await v2Pool.getReserves();
    const erc20 = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const decimals = await erc20.decimals();

    const reservesToken0 = ethers.utils
      .formatEther(reservesToken0Big)
      .toString();

    const reservesToken1 = ethers.utils
      .formatUnits(reservesToken1Big, decimals)
      .toString();
    console.log(reservesToken0, reservesToken1);
  } else {
    console.log('no LP');
  }
}

async function getApprove(token) {
  const erc20 = new ethers.Contract(token, ERC20ABI, provider);

  const ownerAddress = wallet.address;
  const allownAmountBig = await erc20.allowance(ownerAddress, V2RouterAddress);
  const allownAmount = Number(ethers.utils.formatEther(allownAmountBig));

  if (allownAmount === 0) {
    const tx = await erc20
      .connect(wallet)
      .approve(V2RouterAddress, ethers.constants.MaxUint256);
    await tx.wait(1);
    const allownAmountBig = await erc20.allowance(
      ownerAddress,
      V2RouterAddress
    );
    const allownAmount = Number(ethers.utils.formatEther(allownAmountBig));
    console.log(allownAmount);
  }
}

function fromReadableAmount(amount, decimals) {
  return ethers.utils.parseUnits(amount.toString(), decimals);
}

async function main() {
  // await getApprove(WETH);
  await getApprove(tokenAddress);
  await addLiquidity();
  await getLiquidityStatus();
}

main().catch((err) => {
  console.error(err);
});
