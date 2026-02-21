import crypto from 'crypto';
import pkg from 'js-sha3';
const { keccak256 } = pkg;

/**
 * Hashing function with multiple algorithm options.
 * @param {Object|string} data - The object or string to be hashed.
 * @param {string} [algorithm='Keccak-256'] - The hashing algorithm to use.
 * @param {number} [iterations=1] - Number of iterations (if applicable).
 * @returns {string} The resulting hash.
 */
const hash = (data, algorithm = 'Keccak-256', iterations = 1) => {
  const dataString = JSON.stringify(data);
  let hash;

  switch (algorithm) {
    case 'SHA-256':
      hash = crypto.createHash('sha256').update(dataString).digest('hex');
      break;
    case 'DoubleSHA-256':
      hash = crypto.createHash('sha256').update(
        crypto.createHash('sha256').update(dataString).digest()
      ).digest('hex');
      break;
    case 'Keccak-256':
      hash = keccak256(dataString);
      break;
    default:
      throw new Error('Unsupported hashing algorithm');
  }

  for (let i = 1; i < iterations; i++) {
    hash = keccak256(hash);
  }

  return hash;
};

export default hash;