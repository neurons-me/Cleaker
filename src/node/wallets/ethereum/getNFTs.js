const fetchNFTs = async (walletAddress, apiKey = "YOUR_ALCHEMY_API_KEY") => {
  try {
    const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}/getNFTs/?owner=${walletAddress}`;
    const response = await fetch(url); // ✅ Uses global fetch in browsers and Node.js (v18+)
    const data = await response.json();

    return data.ownedNfts || [];
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
};

export default fetchNFTs;