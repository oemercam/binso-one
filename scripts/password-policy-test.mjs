import assert from 'node:assert/strict'
import { hasValidNewPassword, MAX_PASSWORD_LENGTH } from '../lib/password-policy.ts'

for (const password of ['Abcdefg1', 'Abcdefg!', 'Äbcdefg1', 'Aa!'.padEnd(MAX_PASSWORD_LENGTH, 'a')]) {
  assert.equal(hasValidNewPassword(password), true)
}
for (const password of ['Abcdef1', 'abcdefg1', 'ABCDEFG!', 'Abcdefgh', 'Abcdefg ', 'Aa!'.padEnd(MAX_PASSWORD_LENGTH + 1, 'a')]) {
  assert.equal(hasValidNewPassword(password), false)
}
console.log('New password length, upper/lower case and digit-or-symbol policy passed')
