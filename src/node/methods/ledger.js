/**
 * Stores a local ledger entry.
 * @param {string} name - The ledger entry name.
 * @param {object} data - The data to store in the ledger.
 * @returns {object} Ledger entry result.
 */
const ledger = (name, data) => {
    return { entry: name, data, savedAt: new Date().toISOString() };
  };
  
  export default ledger;