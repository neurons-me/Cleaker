import { ethers } from "ethers";
import provider from "./provider.js";

const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

async function getTokenBalance(walletAddress, tokenContractAddress) {
  const tokenContract = new ethers.Contract(tokenContractAddress, erc20Abi, provider);
  const balance = await tokenContract.balanceOf(walletAddress);
  const decimals = await tokenContract.decimals();
  return ethers.utils.formatUnits(balance, decimals);
}

export default getTokenBalance;