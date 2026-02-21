/**
 * Stores wallet in Cleaker's backend.
 */
export const addWalletToServer = async (address, encryptedKey) => {
    const response = await fetch(`${process.env.VITE_API_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, encryptedKey, type: "Ethereum", isDefault: false }),
      credentials: 'include',
    });
  
    if (!response.ok) throw new Error('Failed to add wallet to server');
  };