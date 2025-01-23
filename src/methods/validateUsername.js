//cleaker/src/methods/validateUsername.js
/**
 * Validates a username to ensure it follows subdomain naming rules with additional restrictions.
 * - Length between 5 and 21 characters.
 * - No more than 2 periods.
 * - No consecutive periods or underscores.
 * - No period or underscore at the beginning or end.
 * @param {string} username - The username to validate.
 * @returns {string} The valid username if it passes validation.
 * @throws {Error} If the username is invalid.
 */
function validateUsername(username) {
    // Regular expression to match the restrictions:
    // - Only letters, numbers, periods, and underscores allowed.
    // - No period or underscore at the beginning or end.
    // - No consecutive periods or underscores.
    // - Length must be between 5 and 21 characters.
    const regex = /^(?![_\.])(?!.*[_.]{2})(?!.*\.$)[a-zA-Z0-9._]{5,21}$/;
    const periodCount = (username.match(/\./g) || []).length;
  
    if (regex.test(username) && periodCount <= 2) {
      return username;
    } else {
      throw new Error('Incorrect username. It must follow the rules: 5-21 characters, only letters, numbers, up to 2 periods (not consecutive), and cannot start/end with a period or underscore.');
    }
  }
  
  export default validateUsername;