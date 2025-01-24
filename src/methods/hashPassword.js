import crypto from 'crypto';

/**
 * Hashes a password using a salt and a specified number of iterations.
 *
 * @param {string} password - The plain text password to hash.
 * @param {string} salt - The salt value to use during hashing.
 * @param {number} iterations - The number of hashing iterations.
 * @returns {Promise<string>} A promise that resolves to the hashed password as a hexadecimal string.
 * @throws {Error} If an error occurs during hashing.
 *
 * @example
 * import hashPassword from './hashPassword.js';
 *
 * async function example() {
 *   const password = 'mypassword';
 *   const salt = 'randomSaltValue';
 *   const iterations = 1000;
 *   try {
 *     const hashedPassword = await hashPassword(password, salt, iterations);
 *     console.log(hashedPassword); // Logs the hashed password
 *   } catch (error) {
 *     console.error('Error hashing password:', error.message);
 *   }
 * }
 *
 * example();
 */
function hashPassword(password, salt, iterations) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

export default hashPassword;