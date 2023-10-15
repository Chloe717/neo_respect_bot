/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-08-21 14:04:07
 * @Description:
 */
const { ethers } = require('ethers');
const { abi: ERC20ABI } = require('../../build/ERC20.json');
const { abi: CHECKERABI } = require('../../build/TokenChecker.json');
require('dotenv').config();
const provider = new ethers.providers.JsonRpcProvider(
  process.env.GOERLI_RPC_RPL
);
const tokenAddress = '0xe66f4D419739EFd5b038F4053B074f495D7C8a31';

const checkerAddress = '0xf82921740efeF1D81832B06DCd4DD37b0c521047';
const token = new ethers.Contract(tokenAddress, ERC20ABI, provider);
const checker = new ethers.Contract(checkerAddress, CHECKERABI, provider);
async function check() {
  const owner = '0x9C4DD1f670d0f8Db4920bcCBFa43268062529dd0';

  const ethBalance = await provider.getBalance(owner);
  console.log('ETH', ethers.utils.formatEther(ethBalance));

  const tokenbeforeBalance = await token.balanceOf(owner);
  console.log(
    "mock address's token before exchange",
    ethers.utils.formatEther(tokenbeforeBalance)
  );

  const calldata = checker.interface.encodeFunctionData('check', [
    tokenAddress,
  ]);
  const transaction = {
    from: owner,
    to: checkerAddress,
    value: ethers.utils.parseEther('0.1'),
    gasLimit: ethers.utils.hexValue(450000),
    data: calldata,
  };
  const simulateResult = await provider.call(transaction);

  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['uint256', 'uint256', 'uint256', 'uint256'],
    simulateResult
  );

  const buyExpectedOut = Number(ethers.utils.formatUnits(decoded[0], 18));
  const buyActualOut = Number(ethers.utils.formatUnits(decoded[1], 18));

  const sellExpectedOut = Number(ethers.utils.formatEther(decoded[2]));
  const sellActualOut = Number(ethers.utils.formatUnits(decoded[3], 18));
  const butTax = ((buyExpectedOut - buyActualOut) / buyActualOut) * 100;
  const cellTax = ((sellExpectedOut - sellActualOut) / sellExpectedOut) * 100;
  console.log(butTax.toFixed(2), cellTax.toFixed(2));
  console.log(buyExpectedOut, buyActualOut, sellExpectedOut, sellActualOut);
  const tokenafterBalance = await token.balanceOf(owner);
  console.log(
    "mock address's uni after exchange",
    ethers.utils.formatEther(tokenafterBalance)
  );
  const ethafterBalance = await provider.getBalance(owner);
  console.log(
    "mock address's ETH after exchange",
    ethers.utils.formatEther(ethafterBalance)
  );
}

check().catch((err) => {
  console.error(err);
});
