/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-07-20 12:49:11
 * @Description:
 */
const { GoPlus, ErrorCode } = require('goplus-sdk-js');

let chainId = '1';
// let address = [''];
let results = {};
// It will only return 1 result for the 1st token address if not called getAccessToken before
async function erc20ApprovalSecurity(bot, chatId, address) {
  let ret = await GoPlus.erc20ApprovalSecurity(chainId, address);
  if (ret.code != ErrorCode.SUCCESS) {
    console.error(ret.message);
  } else {
    results = ret.result;

    results.forEach((token) => {
      bot.sendMessage(chatId, `${token.token_name}\n${token.token_address}\n`);
    });
  }
}
module.exports = {
  erc20ApprovalSecurity,
};
