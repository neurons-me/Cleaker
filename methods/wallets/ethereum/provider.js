import { ethers } from "ethers";

// ✅ Use Infura or Alchemy as a provider
const provider = new ethers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"
);

export default provider;