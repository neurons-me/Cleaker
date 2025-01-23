//cleaker/src/methods/verifyPassword.js
import hashPassword from './hashPassword.js';
/**
 * Verifies if a password matches a stored hash.
 * @param {string} password - Plain text password.
 * @param {string} hashedPassword - Stored hashed password.
 * @param {string} salt - Salt used during hashing.
 * @param {number} [iterations=1000] - Iterations used for hashing.
 * @returns {Promise<boolean>} True if the password is valid, false otherwise.
 */
async function verifyPassword(password, hashedPassword, salt, iterations = 1000) {
  const hash = await hashPassword(password, salt, iterations);
  return hash === hashedPassword;
}

export default verifyPassword;