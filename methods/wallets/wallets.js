import { ethers } from 'ethers';
import { saveWalletToSession } from './walletSession.js';
import { addWalletToServer } from './walletAPI.js';

/**
 * Creates a wallet based on the selected blockchain.
 * @param {string} blockchain - Blockchain type (Ethereum, Bitcoin, etc.)
 * @param {string} name - Wallet name
 * @param {string} [icon] - Optional wallet icon
 * @returns {Object} - Wallet object
 */
const createWallet = async (blockchain, name, icon = null) => {
  try {
    let newWallet;
    switch (blockchain) {
      case 'Ethereum':
        newWallet = ethers.Wallet.createRandom();
        break;
      case 'Bitcoin':
        throw new Error("Bitcoin wallet generation is not implemented yet.");
      case 'Dogecoin':
        throw new Error("Dogecoin wallet generation is not implemented yet.");
      case 'XRP':
        throw new Error("XRP wallet generation is not implemented yet.")
      case 'Stellar Lumens':
        throw new Error("Stellar wallet generation is not implemented yet.");
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    const walletData = {
      address: newWallet.address,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic.phrase,
      blockchain,
      name,
      icon,
    };

    saveWalletToSession(walletData);
    await addWalletToServer(walletData);
    return walletData;
  } catch (error) {
    console.error("Wallet creation failed:", error);
    throw new Error("Error creating wallet.");
  }
};

// ✅ Export createWallet to be used in Cleaker module
export { createWallet };