/**
 * Validates an email address to ensure it follows correct syntax.
 * @param {string} email - The email to validate.
 * @returns {string} The valid email if it passes validation.
 * @throws {Error} If the email is invalid.
 */
function validateEmail(email) {
    email = email.trim(); // Remove unnecessary spaces
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (regex.test(email)) {
        return email;
    } else {
        throw new Error(`Invalid email format: ${email}`);
    }
}

export default validateEmail;