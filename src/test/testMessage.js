/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-10-10 17:25:16
 * @Description:
 */
//根据公钥生成地址实例详细流程
const eccrypto = require('eccrypto');
const sha3 = require('js-sha3');
const { ethers, utils } = require('ethers');

const private_key =
  '18e14a7b6a307f426a94f8114701e7c8e774e7f9a47e2c2035db29a206321725';
//  1812224022122722323915418183194121721791891492214812547
const my_wallet = new ethers.Wallet(private_key);
const public_key = my_wallet.publicKey;
console.log(public_key);
printPublicKey(public_key);
//第一步: 移除公钥前两位04，如果包含0x就是移除四位了，再重新加上0x构造
let new_key = '0x' + public_key.substring(4);
//第二步：对上面的结果转化成bytesLike(不能漏)
let new_bytes = utils.arrayify(new_key);
//第三步，keccak_256,得到一个长度为64的哈希值
new_key = sha3.keccak_256(new_bytes);
//第四步，取上面结果的最后40位，就得到了全小写的地址。
let result = '0x' + new_key.substring(24);
//最后，将地址转换成检验后的地址
result = utils.getAddress(result);
console.log('');
console.log(result);
console.log(result === my_wallet.address);

function printPublicKey(public_key) {
  console.log(public_key.substring(2, 4));
  let half = (public_key.length - 4) / 2;
  console.log(public_key.substring(4, 4 + half));
  console.log(public_key.substring(4 + half));
}
