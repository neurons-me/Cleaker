//cleaker/src/methods/validateEmail.js
/**
 * Validates an email address to ensure it follows correct syntax.
 * @param {string} email - The email to validate.
 * @returns {string} The valid email if it passes validation.
 * @throws {Error} If the email is invalid.
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regex.test(email)) {
      return email;
    } else {
      throw new Error('Invalid email format.');
    }
  }
  
  export default validateEmail;