/**
 * Session cookie reader for the 876 session cookie (Console copy).
 *
 * Re-exported from `@876/core/auth/session-cookie`. `verifySession876` checks
 * the cookie's HMAC-SHA256 signature (Web Crypto — Node + Edge) before
 * returning the payload, so its result is safe to use for authorization.
 */
export {
  verifySession876,
  resolveSessionCookieSecret,
  type Session876Account,
  type Session876Snapshot,
} from '@876/core/auth/session-cookie'
