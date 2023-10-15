const ethers = require('ethers');

const poolAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount0',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount1',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'uint160',
        name: 'sqrtPriceX96',
        type: 'uint160',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'liquidity',
        type: 'uint128',
      },
      { indexed: false, internalType: 'int24', name: 'tick', type: 'int24' },
    ],
    name: 'Swap',
    type: 'event',
  },
];

const tokenAbi = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

const provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_RPL_INFURA
);
// const provider = new ethers.AlchemyProvider(null, 'my-alchemy-key')

const buildPagination = (input, perPage = 1000, max_pools = 6000) => {
  const result = [];
  for (let i = 0; i < Math.min(input, max_pools); i += perPage) {
    result.push(i);
  }
  return result;
};

const sqrtToPrice = (sqrt, decimals0, decimals1, token0IsInput = true) => {
  const numerator = sqrt ** 2;
  const denominator = 2 ** 192;
  let ratio = numerator / denominator;
  const shiftDecimals = Math.pow(10, decimals0 - decimals1);
  ratio = ratio * shiftDecimals;
  if (!token0IsInput) {
    ratio = 1 / ratio;
  }
  return ratio;
};

const delay = async (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const PER_PAGE = 1000; // max 1000
const MAX_POOLS = 6000; // max 6000

const main = async () => {
  const axios = require('axios');

  const URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

  const factoryQuery = `
    {
      factory(id: "0x1F98431c8aD98523631AE4a59f267346ea31F984" ) {
        poolCount
      }
    }
    `;
  const factoryResults = await axios.post(URL, { query: factoryQuery });
  const poolCount = factoryResults.data.data.factory.poolCount;
  console.log('poolCount', poolCount);

  let offsets = buildPagination(poolCount, PER_PAGE, MAX_POOLS);
  console.log('offsetsBefore', offsets);

  const requests = offsets.map(async (offset) => {
    const testQuery = `
            {
                pools(first: ${PER_PAGE} skip: ${offset}) {
                    id,
                    liquidity,
                    token0 {
                        id, symbol
                    },
                    token1 {
                        id, symbol
                    }
                }
            }
        `;
    const result = await axios.post(URL, { query: testQuery });
    return result.data.data.pools;
  });

  const poolDatas = await Promise.all(requests);

  // [[1,2], [3,4]] => [1,2,3,4]
  const poolData = poolDatas.flat();

  await addListeners(poolData);
};

async function addListeners(poolData) {
  for (const data of poolData) {
    try {
      const token0Symbol = data.token0.symbol;
      const token1Symbol = data.token1.symbol;

      const poolContract = new ethers.Contract(data.id, poolAbi, provider);

      const token0Contract = new ethers.Contract(
        data.token0.id,
        tokenAbi,
        provider
      );
      const token1Contract = new ethers.Contract(
        data.token1.id,
        tokenAbi,
        provider
      );

      const token0Decimals = await token0Contract.decimals();
      const token1Decimals = await token1Contract.decimals();

      await poolContract.on(
        'Swap',
        (sender, recipient, amount0, amount1, sqrtPriceX96) => {
          const priceRatio = sqrtToPrice(
            sqrtPriceX96.toString(),
            token0Decimals.toString(),
            token1Decimals.toString()
          );
          console.log(
            `Pool: ${token0Symbol}/${token1Symbol} |`,
            `Price: ${priceRatio.toString()} |`,
            `From: ${sender}`
          );
        }
      );
      console.log(`${token0Symbol}/${token1Symbol} added`);
    } catch {
      await delay(5000);
      console.log('failed');
    }
    await delay(100);
  }

  console.log('complete');
}

/*
    node listen
 */

main();
