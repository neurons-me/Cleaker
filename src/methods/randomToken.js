import crypto from 'crypto';

/**
 * Generates a random token (e.g., for verification purposes).
 *
 * @param {number} [length=20] - The length of the token in bytes.
 * @returns {string} A randomly generated token in hexadecimal format.
 *
 * @example
 * import randomToken from './randomToken.js';
 *
 * const token = randomToken(16);
 * console.log(token); // Example output: '9f86d081884c7d659a2feaa0c55ad015'
 */
function randomToken(length = 20) {
  return crypto.randomBytes(length).toString('hex');
}

export default randomToken;