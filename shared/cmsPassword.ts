export const CMS_PASSWORD_MIN_LENGTH = 8;
export const CMS_PASSWORD_REQUIREMENT = "Use at least 8 characters with one uppercase letter and one special character.";

export function isCmsPasswordStrong(password: string) {
  return password.length >= CMS_PASSWORD_MIN_LENGTH
    && /[A-Z]/.test(password)
    && /[^A-Za-z0-9\s]/.test(password);
}
