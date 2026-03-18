function normalizeString(value) {
    return String(value || '').trim();
}
export function normalizeUsername(value) {
    return normalizeString(value)
        .toLowerCase()
        .replace(/^me:\/\//, '')
        .replace(/\/+$/, '')
        .replace(/:\d+$/, '');
}
export function usernameRegexPasses(value, options = {}) {
    const normalized = normalizeUsername(value);
    if (!normalized)
        return options.allowEmpty === true;
    if (normalized.length < 5 || normalized.length > 32)
        return false;
    if (!/^[a-z0-9._-]+$/.test(normalized))
        return false;
    if (normalized.startsWith('.') || normalized.endsWith('.') || normalized.includes('..'))
        return false;
    return true;
}
export function emailRegexPasses(value, options = {}) {
    const normalized = normalizeString(value).toLowerCase();
    if (!normalized)
        return options.allowEmpty === true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
export function phoneRegexPasses(value, options = {}) {
    const normalized = normalizeString(value);
    if (!normalized)
        return options.allowEmpty === true;
    return /^\+?[0-9\s()-]{7,20}$/.test(normalized);
}
export function validatePublicProfileInputs(input) {
    const normalizedUsername = normalizeUsername(input.username);
    const normalizedEmail = normalizeString(input.email).toLowerCase();
    const normalizedPhone = normalizeString(input.phone);
    const usernamePass = usernameRegexPasses(normalizedUsername, { allowEmpty: false });
    const emailPass = emailRegexPasses(normalizedEmail, { allowEmpty: input.emailAllowEmpty !== false });
    const phonePass = phoneRegexPasses(normalizedPhone, { allowEmpty: input.phoneAllowEmpty !== false });
    return {
        username: { pass: usernamePass, normalized: normalizedUsername },
        email: { pass: emailPass, normalized: normalizedEmail },
        phone: { pass: phonePass, normalized: normalizedPhone },
        pass: usernamePass && emailPass && phonePass,
    };
}
//# sourceMappingURL=validation.js.map