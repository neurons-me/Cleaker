import provider from "./provider.js";
import { ethers } from "ethers";

export default async function getBalance(walletAddress) {
  const balance = await provider.getBalance(walletAddress);
  return ethers.formatEther(balance);
}