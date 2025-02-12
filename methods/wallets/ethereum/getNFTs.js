import { Network, Alchemy } from "alchemy-sdk";

// ✅ Setup Alchemy API
const settings = {
  apiKey: "YOUR_ALCHEMY_API_KEY", // 🔹 Replace with your Alchemy API key
  network: Network.ETH_MAINNET,  // 🔹 Supports ETH, Polygon, Optimism, etc.
};

const alchemy = new Alchemy(settings);

export default async function getNFTs(walletAddress) {
  try {
    const nfts = await alchemy.nft.getNftsForOwner(walletAddress);
    return nfts.ownedNfts.map(nft => ({
      name: nft.title || "Unknown NFT",
      image: nft.media[0]?.gateway || null,
      contract: nft.contract.address,
      tokenId: nft.tokenId,
    }));
  } catch (error) {
    console.error("Failed to fetch NFTs:", error);
    return [];
  }
}