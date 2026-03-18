export interface ValidationRuleOptions {
  allowEmpty?: boolean;
}

function normalizeString(value: string): string {
  return String(value || '').trim();
}

export function normalizeUsername(value: string): string {
  return normalizeString(value)
    .toLowerCase()
    .replace(/^me:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/:\d+$/, '');
}

export function usernameRegexPasses(value: string, options: ValidationRuleOptions = {}): boolean {
  const normalized = normalizeUsername(value);
  if (!normalized) return options.allowEmpty === true;
  if (normalized.length < 5 || normalized.length > 32) return false;
  if (!/^[a-z0-9._-]+$/.test(normalized)) return false;
  if (normalized.startsWith('.') || normalized.endsWith('.') || normalized.includes('..')) return false;
  return true;
}

export function emailRegexPasses(value: string, options: ValidationRuleOptions = {}): boolean {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return options.allowEmpty === true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function phoneRegexPasses(value: string, options: ValidationRuleOptions = {}): boolean {
  const normalized = normalizeString(value);
  if (!normalized) return options.allowEmpty === true;
  return /^\+?[0-9\s()-]{7,20}$/.test(normalized);
}

export interface PublicProfileValidationResult {
  username: {
    pass: boolean;
    normalized: string;
  };
  email: {
    pass: boolean;
    normalized: string;
  };
  phone: {
    pass: boolean;
    normalized: string;
  };
  pass: boolean;
}

export function validatePublicProfileInputs(input: {
  username: string;
  email: string;
  phone: string;
  emailAllowEmpty?: boolean;
  phoneAllowEmpty?: boolean;
}): PublicProfileValidationResult {
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
