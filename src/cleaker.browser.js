// cleaker.browser.js
import { BrowserProvider, Wallet, Contract, formatEther, parseEther, formatUnits } from "ethers";

// ✅ Ensure Ethers.js is loaded properly
if (!BrowserProvider) {
  console.error("❌ Ethers.js failed to load. Ensure it is installed correctly.");
}

class CleakerBrowser {
  constructor() {
    if (!window.ethereum) {
      console.warn("⚠️ No Web3 provider detected! Please install MetaMask or another wallet.");
      this.provider = null; // No provider available
    } else {
      this.provider = new BrowserProvider(window.ethereum); // ✅ Correct initialization
    }
  }

  // ✅ Get Ethereum Balance
  async getBalance(walletAddress) {
    if (!this.provider) {
      console.error("❌ No Web3 provider detected!");
      return null;
    }

    try {
      const balance = await this.provider.getBalance(walletAddress);
      return formatEther(balance); // ✅ Correct function usage
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }

  // ✅ Get ERC-20 Token Balance (Requires Contract Address)
  async getTokenBalance(walletAddress, tokenAddress) {
    if (!this.provider) {
      console.error("❌ No Web3 provider detected!");
      return null;
    }

    const abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    try {
      const contract = new Contract(tokenAddress, abi, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      return formatUnits(balance, decimals); // ✅ Correct function usage
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return null;
    }
  }

  // ✅ Get NFTs (Uses Alchemy API)
  async getNFTs(walletAddress) {
    try {
      const response = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY/getNFTs/?owner=${walletAddress}`
      );
      const data = await response.json();
      return data.ownedNfts || [];
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  }

  // ✅ Send Transaction
  async sendTransaction(privateKey, toAddress, amount) {
    if (!this.provider) {
      console.error("❌ No Web3 provider detected!");
      return null;
    }

    try {
      const wallet = new Wallet(privateKey, this.provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: parseEther(amount), // ✅ Correct function usage
      });
      return tx.hash;
    } catch (error) {
      console.error("Error sending transaction:", error);
      return null;
    }
  }
}

// ✅ Export a Singleton Instance for Browser Usage
const cleakerBrowser = new CleakerBrowser();
export default cleakerBrowser;