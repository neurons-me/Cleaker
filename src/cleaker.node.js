import me from './node/methods/me.js'; 
import salt from './node/methods/salt.js';
import generatePassword from './node/methods/generatePassword.js'; 
import validateUsername from './node/methods/validateUsername.js'; 
import validateEmail from './node/methods/validateEmail.js'; 
import verifyPassword from './node/methods/verifyPassword.js'; 
import randomToken from './node/methods/randomToken.js'; 
import passwordSecurityCheck from './node/methods/passwordSecurityCheck.js';
import hash from './node/methods/hash.js';
import hashPassword from './node/methods/hashPassword.js';
import ledger from './node/methods/ledger.js'; 
import blockchain from './node/methods/blockchain.js';
// Import Ethereum Wallet Methods
import getBalance from './node/wallets/ethereum/getBalance.js';
import getTokenBalance from './node/wallets/ethereum/getTokens.js';
import getNFTs from './node/wallets/ethereum/getNFTs.js';
import sendTransaction from './node/wallets/ethereum/sendTransaction.js';
class cleaker {
  constructor(ledger) { 
    this.ledger = ledger;
  }
  // • static → This means the method can be called directly on the cleaker class without needing an instance of it.
  static hash(data, algorithm = 'Keccak-256', iterations = 1) { return hash(data, algorithm, iterations); }
  static me(options) { return me(options); } // me DID under cleaker.me authority
  static salt(length = 16) { return salt(length); }
  static generatePassword(length = 12) { return generatePassword(length); }
  static validateUsername(username) { return validateUsername(username); }
  static validateEmail(email) { return validateEmail(email); }
  static verifyPassword(password, hashedPassword, salt, iterations = 1000) { return verifyPassword(password, hashedPassword, salt, iterations); }
  static randomToken(length = 20) { return randomToken(length); }
  static passwordSecurityCheck(password) { return passwordSecurityCheck(password); }
  static hashPassword(password, salt, iterations = 1000) { return hashPassword(password, salt, iterations); } 
  static ledger(did, data) { return ledger(did, data); }
  static blockchain(did, data) { return blockchain(did, data); }
  // Ethereum Wallet Methods
  static getBalance(walletAddress) { return getBalance(walletAddress); }
  static getTokenBalance(walletAddress, tokenAddress) { return getTokenBalance(walletAddress, tokenAddress); }
  static getNFTs(walletAddress) { return getNFTs(walletAddress); }
  static sendTransaction(privateKey, toAddress, amount) { return sendTransaction(privateKey, toAddress, amount); }
} export default cleaker;