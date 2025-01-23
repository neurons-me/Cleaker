//cleaker/src/methods/passwordSecurityCheck.js
/**
 * Checks if a password meets basic security criteria.
 * Criteria: At least 8 characters, includes uppercase, lowercase, number, and special character.
 * @param {string} password - The password to check.
 * @returns {boolean} True if the password is secure, false otherwise.
 */
function passwordSecurityCheck(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }
  
  export default passwordSecurityCheck;
