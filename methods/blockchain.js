/**
 * Registers a blockchain transaction.
 * @param {string} name - The blockchain transaction name.
 * @param {object} data - The data to register on the blockchain.
 * @returns {object} Blockchain transaction result. */
const blockchain = (name, data) => {
    return { transaction: name, data, confirmedAt: new Date().toISOString() };
  };
  
  export default blockchain;