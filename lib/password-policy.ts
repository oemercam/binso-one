export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 256

export const PASSWORD_REQUIREMENTS = "Mindestens 8 Zeichen mit Gross- und Kleinbuchstaben sowie einer Zahl und einem Sonderzeichen."

export function hasValidNewPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH &&
    /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password) && /\p{Nd}/u.test(password) && /[\p{P}\p{S}]/u.test(password)
}
