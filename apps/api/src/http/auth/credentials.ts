import { createHash, timingSafeEqual } from 'node:crypto'

import type { Request } from 'express'

/**
 * Reading credentials off a request, and comparing them safely.
 *
 * Kept apart from the guards so the header contract — which is fixed by every
 * app bridge and SDK already in production — is stated in one place.
 */

const API_KEY_PREFIX = '876_app_secret_'

/**
 * The app API key, from any header the existing clients send.
 *
 * `Authorization: Bearer` is accepted only when the value carries the app-key
 * prefix, so an OAuth access token in that header is never mistaken for one.
 */
export function readApiKey(req: Request): string | null {
  const dedicated = req.header('x-876-api-key') ?? req.header('x-api-key')
  if (dedicated?.trim()) return dedicated.trim()

  const authorization = req.header('authorization')
  if (authorization?.startsWith(`Bearer ${API_KEY_PREFIX}`))
    return authorization.slice('Bearer '.length).trim() || null

  return null
}

/** The OAuth access token, if the request carries a bearer credential. */
export function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice('Bearer '.length).trim()
  // An app key in this header is a key, not a session token.
  if (!token || token.startsWith(API_KEY_PREFIX)) return null

  return token
}

export function readInternalKey(req: Request): string | null {
  return req.header('x-internal-key')?.trim() || null
}

export function hasApiKeyPrefix(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX)
}

/** The stored hash of an API key. Keys are compared by hash, never by plaintext. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex')
}

/**
 * A non-reversible fingerprint for logs.
 *
 * Lets an operator correlate repeated rejections of the same bad key without
 * the raw secret ever reaching log storage.
 */
export function keyFingerprint(key: string): string {
  return hashApiKey(key).slice(0, 12)
}

/**
 * Constant-time comparison of two secrets.
 *
 * Both sides are hashed first so the comparison is over fixed-length buffers:
 * `timingSafeEqual` throws on a length mismatch, and branching on that would
 * leak the length of the configured key.
 */
export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false

  return timingSafeEqual(
    createHash('sha256').update(presented, 'utf8').digest(),
    createHash('sha256').update(configured, 'utf8').digest()
  )
}
