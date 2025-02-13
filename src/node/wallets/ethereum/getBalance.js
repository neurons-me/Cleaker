import { ethers } from "ethers";

// ✅ Get ETH Balance
async function getBalance(walletAddress, providerUrl = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID") {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const balance = await provider.getBalance(walletAddress);
    return ethers.formatEther(balance); // Convert Wei to ETH
  } catch (error) {
    console.error("Error fetching balance:", error);
    return null;
  }
}

export default getBalance;