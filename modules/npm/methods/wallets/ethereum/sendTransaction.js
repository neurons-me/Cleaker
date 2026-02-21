import { ethers } from "ethers";
import provider from "./provider.js";

async function sendTransaction(privateKey, toAddress, amount) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("Invalid private key format");
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
  });

  return tx.hash;
}

export default sendTransaction;