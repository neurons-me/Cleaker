import CryptoJS from 'crypto-js';

/**
 * Encrypts private key before storing it.
 */
const encryptPrivateKey = (privateKey, password) => {
  return CryptoJS.AES.encrypt(privateKey, password).toString();
};

/**
 * Saves wallet details to session storage.
 */
export const saveWalletToSession = (wallet) => {
  const encryptedKey = encryptPrivateKey(wallet.privateKey, "user-secure-pass");
  const sessionWallet = {
    address: wallet.address,
    publicKey: wallet.publicKey,
    encryptedKey,
  };
  localStorage.setItem('userWallet', JSON.stringify(sessionWallet));
};