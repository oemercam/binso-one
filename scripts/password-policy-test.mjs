import assert from 'node:assert/strict'
import { hasValidNewPassword, MAX_PASSWORD_LENGTH } from '../lib/password-policy.ts'

for (const password of ['Abcdef1!', 'Äbcdef1!', 'Aa1!'.padEnd(MAX_PASSWORD_LENGTH, 'a')]) {
  assert.equal(hasValidNewPassword(password), true)
}
for (const password of ['Abcde1!', 'abcdef1!', 'ABCDEF1!', 'Abcdefg1', 'Abcdefg!', 'Abcdefgh', 'Abcdefg ', 'Aa1!'.padEnd(MAX_PASSWORD_LENGTH + 1, 'a')]) {
  assert.equal(hasValidNewPassword(password), false)
}
console.log('New password length, upper/lower case and digit-and-symbol policy passed')
