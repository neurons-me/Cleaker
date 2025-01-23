//cleaker/src/methods/generatePassword.js
/**
 * Generates a strong password with a combination of letters, numbers, and symbols.
 *
 * @param {number} [length=12] - Length of the generated password.
 * @returns {string} The generated password.
 *
 * @example
 * import generatePassword from './generatePassword.js';
 *
 * const myPassword = generatePassword(16);
 * console.log(myPassword); // Example output: 'aB3!xD@eFg#1$hIj'
 */
function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

export default generatePassword;
