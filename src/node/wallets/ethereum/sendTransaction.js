import { ethers } from "ethers";

async function sendTransaction(privateKey, toAddress, amount, providerUrl = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID") {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount), // Convert ETH to Wei
      gasLimit: 21000,
    });

    return tx.hash; // ✅ Return transaction hash
  } catch (error) {
    console.error("Error sending transaction:", error);
    return null;
  }
}

export default sendTransaction;

/*
const txHash = await sendTransaction("0xYourPrivateKey", "0xReceiverAddress", "0.01");
console.log("Transaction Hash:", txHash);
*/