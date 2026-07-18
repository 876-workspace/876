/**
 * Shared reader for the 876 session cookie set by the Python API.
 *
 * The cookie is `base64url(JSON payload + "." + hex(HMAC-SHA256(payload, secret)))`,
 * sealed by `apps/api/core/session.py` with the shared `SESSION_COOKIE_SECRET`.
 *
 * Two readers are exported:
 *
 * - `verifySession876` — verifies the HMAC signature (Web Crypto, works in both
 *   Node and Edge runtimes) before returning the payload. This is the ONLY
 *   reader that may back authorization decisions (`getAuthSession`, guards,
 *   route handlers).
 * - `decodeSession876Insecure` — parses without verifying the signature. Kept
 *   only for display-level fallbacks where the secret is genuinely unavailable;
 *   never use its output to authorize anything.
 */

import { nowUnixSeconds } from '../lib/timestamps'

/** One signed-in account in the multi-account set (token-free identity + sid). */
export type Session876Account = {
  userId: string
  email: string
  accountType?: string
  firstName?: string | null
  lastName?: string | null
  emailVerified?: boolean
  avatar?: string | null
  username?: string | null
  sid: string
  /** 'consumer' for personal accounts; 'enterprise' for SSO-linked org sessions. */
  realm?: 'consumer' | 'enterprise'
  /** Platform org ID when realm is 'enterprise'. */
  orgId?: string | null
  /** Realm-gate exception: when true this account may use any app/realm. */
  crossRealm?: boolean
}

export type Session876Snapshot = {
  userId?: string
  email?: string
  accountType?: string
  accessToken?: string
  firstName?: string | null
  lastName?: string | null
  emailVerified?: boolean
  avatar?: string | null
  username?: string | null
  exp?: number
  /** Active session id (multi-account cookies only). */
  sid?: string
  /** All accounts signed in on this device (multi-account cookies only). */
  accounts?: Session876Account[]
  /** 'consumer' for personal accounts; 'enterprise' for SSO-linked org sessions. */
  realm?: 'consumer' | 'enterprise'
  /** Platform org ID when realm is 'enterprise'. */
  orgId?: string | null
  /** Realm-gate exception: when true this account may use any app/realm. */
  crossRealm?: boolean
}

/**
 * Mirrors the API's dev fallback (`core/config.py`). Lets local dev work
 * without configuring a secret; production must set SESSION_COOKIE_SECRET.
 */
const DEV_SESSION_COOKIE_SECRET =
  'dev-only-session-cookie-secret-change-before-production'

/**
 * Resolve the secret used to verify the session cookie HMAC.
 *
 * Must mirror the API's `resolved_session_cookie_secret` (core/config.py)
 * exactly, including its `WORKOS_COOKIE_PASSWORD` fallback — otherwise the API
 * could sign cookies with a secret these apps don't try, and every session
 * would silently fail to verify.
 *
 * Returns `null` in production when no secret is configured so callers fail
 * closed (treat every cookie as invalid) instead of accepting forgeries.
 */
export function resolveSessionCookieSecret(): string | null {
  const configured =
    process.env.SESSION_COOKIE_SECRET || process.env.WORKOS_COOKIE_PASSWORD
  if (configured) return configured
  if (process.env.NODE_ENV !== 'production') return DEV_SESSION_COOKIE_SECRET
  return null
}

/**
 * Verify the cookie's HMAC-SHA256 signature and return the session payload,
 * or `null` when the signature, shape, or expiry is invalid.
 */
export async function verifySession876(
  cookieValue: string,
  secret: string | null = resolveSessionCookieSecret()
): Promise<Session876Snapshot | null> {
  if (!secret) return null

  const split = decodeAndSplit(cookieValue)
  if (!split) return null

  const signature = hexToArrayBuffer(split.signature)
  if (!signature) return null

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      utf8ToArrayBuffer(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      utf8ToArrayBuffer(split.payload)
    )
    if (!valid) return null
  } catch {
    return null
  }

  return parsePayload(split.payload)
}

/**
 * Decode the session cookie payload WITHOUT signature verification.
 * Never use the result for authorization decisions.
 */
export function decodeSession876Insecure(
  cookieValue: string
): Session876Snapshot | null {
  const split = decodeAndSplit(cookieValue)
  if (!split) return null
  return parsePayload(split.payload)
}

function decodeAndSplit(
  cookieValue: string
): { payload: string; signature: string } | null {
  const decoded = base64urlDecode(cookieValue)
  if (!decoded) return null
  const lastDot = decoded.lastIndexOf('.')
  if (lastDot === -1) return null
  return {
    payload: decoded.slice(0, lastDot),
    signature: decoded.slice(lastDot + 1),
  }
}

function parsePayload(payload: string): Session876Snapshot | null {
  try {
    const parsed = JSON.parse(payload) as Session876Snapshot
    if (typeof parsed !== 'object' || parsed === null) return null
    if (parsed.exp && parsed.exp < nowUnixSeconds()) return null
    return parsed
  } catch {
    return null
  }
}

function base64urlDecode(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function utf8ToArrayBuffer(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value)
  const buffer = new ArrayBuffer(encoded.byteLength)
  new Uint8Array(buffer).set(encoded)
  return buffer
}

function hexToArrayBuffer(hex: string): ArrayBuffer | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return null
  }
  const buffer = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return buffer
}
