import crypto from 'crypto'

const SALT = 'wsa_backoffice_salt_2026'

/**
 * Hashes a password using SHA-256 with a static salt
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex')
}

/**
 * Verifies a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}
