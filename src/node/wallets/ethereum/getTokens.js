import { ethers } from "ethers";
import ERC20_ABI from "./abis/erc20.js"; // ✅ Import ERC-20 ABI
async function getTokenBalance(walletAddress, tokenAddress, providerUrl = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID") {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider); // ✅ Load contract
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals(); // ✅ Get token decimals
    return ethers.formatUnits(balance, decimals); // ✅ Convert balance
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return null; }} export default getTokenBalance;

    