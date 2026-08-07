/**
 * Session cookie sealing and unsealing.
 *
 * The cookie is an HMAC-SHA256-signed JSON payload carrying the minimum the
 * Next.js apps need to make routing decisions without a round-trip to the API:
 * the active account's identity, its access token, and an expiry.
 *
 * ## The wire format is a cross-service contract
 *
 * ```
 * base64url( <compact JSON payload> "." <hex HMAC-SHA256(payload, secret)> )
 * ```
 *
 * Unpadded — a trailing `=` is stripped, because some cookie parsers and
 * middleware mishandle it. `@876/core`'s `verifySession876` is the reader on the
 * app side and only ever verifies; this module is the only writer. Both sides
 * recompute the HMAC over the decoded payload string, so a cookie sealed here
 * verifies there byte for byte — `__tests__/session.test.ts` asserts that
 * against a fixture sealed by `core.session.seal_session`.
 *
 * ## One deliberate difference from `@876/core`
 *
 * `unsealSession` rejects a payload with **no** `exp`, matching
 * `core/session.py` (`payload.get("exp", 0) < time.time()`). `@876/core`'s
 * `parsePayload` uses `if (parsed.exp && …)`, so a cookie with no expiry passes
 * there. The stricter reading belongs on the API side: a cookie the API cannot
 * date is a cookie it cannot trust.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import { nowUnixSeconds } from '@/platform/timestamps'

/** 400 days — the Python default, and the maximum Chrome honours. */
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 400

export type Realm = 'consumer' | 'enterprise'

export type AccountIdentity = {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  avatar: string | null
  username: string | null
  realm: string
  orgId?: string
  crossRealm?: true
}

export type AccountEntry = AccountIdentity & { sid: string }

export type SessionPayload = AccountIdentity & {
  accessToken: string | null
  exp: number
  sid?: string
  accounts?: AccountEntry[]
}

/**
 * The provider/repository shapes this reads from use either casing, because the
 * Python accepted both — a WorkOS response is camelCase, a database row is
 * snake_case, and both reach this function.
 */
export type UserLike = Record<string, unknown>

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function pick(source: UserLike, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = str(source[key])
    if (value) return value
  }
  return null
}

/**
 * Lightweight, token-free identity fields for one account.
 *
 * Shared by the active-account snapshot (the cookie's top level) and by each
 * entry in the multi-account `accounts` list, so the chooser can display every
 * signed-in account and a switch can promote any of them.
 *
 * `crossRealm` is the per-user realm-gate exception, surfaced so the app guards
 * can let an owner or super-admin into any realm. It is carried on every account
 * entry, so switching accounts preserves it.
 */
export function accountIdentity(
  userData: UserLike,
  options: { realm?: string; orgId?: string | null; crossRealm?: boolean } = {}
): AccountIdentity {
  const identity: AccountIdentity = {
    userId: pick(userData, 'id', 'userId') ?? '',
    email: str(userData['email']) ?? '',
    firstName: pick(userData, 'firstName', 'first_name'),
    lastName: pick(userData, 'lastName', 'last_name'),
    emailVerified: Boolean(
      userData['emailVerified'] ?? userData['email_verified'] ?? false
    ),
    avatar: str(userData['avatar']),
    username: str(userData['username']),
    realm: options.realm ?? 'consumer',
  }

  // Both are omitted rather than set to a falsy value, matching the Python —
  // their presence in the payload is itself the signal.
  if (options.orgId) identity.orgId = options.orgId
  if (options.crossRealm) identity.crossRealm = true

  return identity
}

/** One entry in the multi-account `accounts` list — identity plus its sid. */
export function accountEntry(
  userData: UserLike,
  sessionId: string,
  options: { realm?: string; orgId?: string | null; crossRealm?: boolean } = {}
): AccountEntry {
  return { ...accountIdentity(userData, options), sid: sessionId }
}

/**
 * Add `newEntry` to the signed-in account set, de-duped by `userId`.
 *
 * Re-authenticating an account already in the set replaces its stale entry —
 * and its stale sid — rather than appending a duplicate. Order is preserved with
 * the freshly authenticated account last.
 */
export function mergeAccounts(
  existing: AccountEntry[] | null | undefined,
  newEntry: AccountEntry
): AccountEntry[] {
  const kept = (existing ?? []).filter(
    (account) => account.userId !== newEntry.userId
  )

  return [...kept, newEntry]
}

/**
 * The account entry whose `sid` matches, or null when absent.
 *
 * The caller **must** use this to confirm a switch target belongs to the
 * cookie's own account set — never trust a sid supplied by the client.
 */
export function selectAccount(
  accounts: AccountEntry[] | null | undefined,
  sid: string
): AccountEntry | null {
  return (accounts ?? []).find((account) => account.sid === sid) ?? null
}

/**
 * Seal a signed, base64url-encoded session cookie value.
 *
 * The active account's identity stays at the top level, so every existing
 * reader keeps working. When `sessionId` and `accounts` are supplied the cookie
 * additionally carries the active session id and the full signed-in account set
 * for multi-account switching.
 */
export function sealSession(options: {
  userData: UserLike
  accessToken: string | null
  secret: string
  ttlSeconds?: number
  sessionId?: string | null
  accounts?: AccountEntry[] | null
  realm?: string
  orgId?: string | null
  crossRealm?: boolean
}): string {
  const identity = accountIdentity(options.userData, {
    realm: options.realm,
    orgId: options.orgId,
    crossRealm: options.crossRealm,
  })

  const payload: SessionPayload = {
    ...identity,
    accessToken: options.accessToken,
    exp: nowUnixSeconds() + (options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS),
  }
  if (options.sessionId != null) payload.sid = options.sessionId
  if (options.accounts != null) payload.accounts = options.accounts

  const encoded = JSON.stringify(payload)
  const signed = `${encoded}.${sign(encoded, options.secret)}`

  return base64urlEncode(signed)
}

/** Verify the signature and return the payload, or null on any failure. */
export function unsealSession(
  cookieValue: string,
  secret: string
): SessionPayload | null {
  const decoded = base64urlDecode(cookieValue)
  if (decoded === null) return null

  // Split on the *last* dot: the payload is JSON and may contain dots of its own.
  const lastDot = decoded.lastIndexOf('.')
  if (lastDot === -1) return null

  const payloadString = decoded.slice(0, lastDot)
  const signature = decoded.slice(lastDot + 1)

  if (!signaturesMatch(signature, sign(payloadString, secret))) return null

  let payload: unknown
  try {
    payload = JSON.parse(payloadString)
  } catch {
    return null
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
    return null

  const candidate = payload as SessionPayload
  // A missing `exp` is treated as expired, not as "never expires".
  if ((candidate.exp ?? 0) < nowUnixSeconds()) return null

  return candidate
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

/**
 * Compare two hex signatures without leaking where they diverge.
 *
 * `timingSafeEqual` throws on a length mismatch, so both sides are hashed to a
 * fixed width first — a forged signature of the wrong length must fail the same
 * way as one of the right length.
 */
function signaturesMatch(a: string, b: string): boolean {
  const left = createHmac('sha256', 'session-signature-compare')
    .update(a)
    .digest()
  const right = createHmac('sha256', 'session-signature-compare')
    .update(b)
    .digest()

  return timingSafeEqual(left, right)
}

/** Unpadded base64url, as the cookie format requires. */
function base64urlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64urlDecode(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    return null
  }
}
