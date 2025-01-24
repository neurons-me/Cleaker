/**
 * Validates a username to ensure it meets specific rules.
 * @param {string} username - The username to validate.
 * @returns {string} The valid username if it passes validation.
 * @throws {Error} If the username does not meet the criteria.
 */
function validateUsername(username) {
    // Regular expression to match the restrictions:
    // - Only letters, numbers, periods, and underscores allowed.
    // - No period or underscore at the beginning or end.
    // - No consecutive periods or underscores.
    // - Length must be between 5 and 21 characters.
    const regex = /^(?![_\.])(?!.*[_.]{2})(?!.*\.$)[a-zA-Z0-9._]{5,21}$/;
    const periodCount = (username.match(/\./g) || []).length;
    if (!regex.test(username)) {
        throw new Error('Username must be 5-21 characters, only letters, numbers, and up to 2 periods or underscores.');
    }
    if (periodCount > 2) {
        throw new Error('Username cannot have more than 2 periods.');
    }

    return username;
}

// Default export
export default validateUsername;