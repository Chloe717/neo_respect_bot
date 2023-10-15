/*
 * @Author: Wmengti 0x3ceth@gmail.com
 * @LastEditTime: 2023-08-24 14:50:45
 * @Description:
 */
const { GoPlus, ErrorCode } = require('goplus-sdk-js');

let chainId = '1';
// let address = ['0x1afb88b80346e77386c37e8e53497c30f4147736'];
let results = {};
// It will only return 1 result for the 1st token address if not called getAccessToken before
async function addressSecurity(bot, chatId, address, language) {
  let ret = await GoPlus.addressSecurity(chainId, address);
  if (ret.code != ErrorCode.SUCCESS) {
    console.error(ret.message);
  } else {
    results = ret.result;
    if (!results.data_source) {
      bot.sendMessage(
        chatId,
        language === 'English'
          ? `\`No address related information found\``
          : '`没有相关地址信息`',
        {
          parse_mode: 'Markdown',
        }
      );
    } else {
      bot.sendMessage(
        chatId,
        language === 'English'
          ? `🐶*Number of Malicious Contracts Created:* ${
              results.number_of_malicious_contracts_created
                ? results.number_of_malicious_contracts_created
                : 0
            }\n⚠️*Machine test results*⚠️ 
${
  results.honeypot_related_address === '1' ? '`Honeypot-related Address`\n' : ''
}${results.phishing_activities === '1' ? '`Phishing Activities`\n' : ''}${
              results.blackmail_activities === '1'
                ? '`Blackmail Activities`\n'
                : ''
            }${results.stealing_attack === '1' ? '`Stealing Attack`\n' : ''}${
              results.fake_kyc === '1' ? '`Fake KYC`\n' : ''
            }${
              results.malicious_mining_activities === '1'
                ? '`Malicious Mining`\n'
                : ''
            }${
              results.darkweb_transactionss === '1'
                ? '`Darkweb Transactions`\n'
                : ''
            }${results.cybercrime === '1' ? '`Cybercrime`\n' : ''}${
              results.money_laundering === '1' ? '`Money Laundering`\n' : ''
            }${results.financial_crime === '1' ? '`Financial Crime`\n' : ''}${
              results.blacklist_doubt === '1' ? '`Blacklist Doubt`\n' : ''
            }${
              results.contract_address === '1' ? '`Is Contract Address`\n' : ''
            }${results.mixer === '1' ? '`Is Mixer Address`\n' : ''}${
              results.sanctioned === '1' ? '`Sanctioned Mark`\n' : ''
            }
  `
          : `🐶*创建的恶意合约数量:* ${
              results.number_of_malicious_contracts_created
                ? results.number_of_malicious_contracts_created
                : 0
            }\n⚠️*智能检测结果*⚠️ 
${results.honeypot_related_address === '1' ? '`蜜罐合约`\n' : ''}${
              results.phishing_activities === '1' ? '`钓鱼网站`\n' : ''
            }${results.blackmail_activities === '1' ? '`勒索`\n' : ''}${
              results.stealing_attack === '1' ? '`盗窃攻击`\n' : ''
            }${results.fake_kyc === '1' ? '`假KYC`\n' : ''}${
              results.malicious_mining_activities === '1' ? '`恶意挖矿`\n' : ''
            }${results.darkweb_transactionss === '1' ? '`暗网交易`\n' : ''}${
              results.cybercrime === '1' ? '`网络犯罪`\n' : ''
            }${results.money_laundering === '1' ? '`洗钱`\n' : ''}${
              results.financial_crime === '1' ? '`金融犯罪`\n' : ''
            }${results.blacklist_doubt === '1' ? '`黑名单嫌疑`\n' : ''}${
              results.contract_address === '1' ? '`合约地址`\n' : ''
            }${results.mixer === '1' ? '`混合地址`\n' : ''}${
              results.sanctioned === '1' ? '`制裁标记`\n' : ''
            }
`,
        { parse_mode: 'Markdown' }
      );
    }
  }
}
module.exports = {
  addressSecurity,
};
