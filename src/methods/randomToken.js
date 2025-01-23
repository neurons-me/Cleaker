//cleaker/src/methods/randomToken.js
import crypto from 'crypto';
/**
 * Generates a random token (e.g., for verification).
 * @param {number} [length=20] - Length of the token.
 * @returns {string} Random token.
 */
function randomToken(length = 20) {
  return crypto.randomBytes(length).toString('hex');
}
export default randomToken;