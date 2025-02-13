import crypto from 'crypto';

/**
 * Generates a cryptographic salt for secure operations (e.g., password hashing).
 *
 * @param {number} [length=16] - The desired length of the salt in bytes.
 * @returns {string} A randomly generated salt in hexadecimal format.
 *
 * @example
 * import salt from './salt.js';
 *
 * const mySalt = salt(16);
 * console.log(mySalt); // Example output: 'e3b0c44298fc1c14'
 */
function salt(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

export default salt;