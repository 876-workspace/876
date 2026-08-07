import { createHash } from 'node:crypto'

import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'

/**
 * Fixed-window rate limiting for credential-guessing auth endpoints.
 *
 * All browser traffic reaches the API through each app's server-side auth
 * bridge, so the client IP the API sees is the Next.js server — per-IP limits
 * would throttle every user at once. Limits are therefore keyed on the
 * credential target itself (identifier, email, or token), which is also the
 * value an attacker must hold constant while brute-forcing.
 *
 * The window state is in-process memory: it resets on restart and is not
 * shared across workers. That is an accepted baseline — each worker still
 * caps the attempt rate, and the protected secrets (passwords, OTP codes,
 * reset tokens) need far more attempts than any per-worker budget allows.
 */

const log = getLogger('rate-limit')

type WindowEntry = { startedAt: number; count: number }

// `${scope}\n${hashedKey}` -> window entry
const windows = new Map<string, WindowEntry>()

// Prune expired windows once the table grows past this, so a scan across many
// distinct keys cannot grow memory without bound.
const MAX_ENTRIES = 10_000

/**
 * Count one attempt for `key` in `scope`; throw 429 when over the limit.
 *
 * `key` is hashed before storage so raw identifiers and tokens never sit
 * in process memory longer than the call.
 */
export function enforceRateLimit(
  scope: string,
  key: string,
  {
    maxAttempts,
    windowSeconds,
  }: {
    maxAttempts: number
    windowSeconds: number
  }
): void {
  const now = Math.floor(Date.now() / 1000)
  const hashedKey = createHash('sha256').update(key, 'utf8').digest('hex')
  const mapKey = `${scope}\n${hashedKey}`

  const existing = windows.get(mapKey)
  let startedAt = existing?.startedAt ?? now
  let count = existing?.count ?? 0

  if (now - startedAt >= windowSeconds) {
    startedAt = now
    count = 0
  }

  count += 1
  windows.set(mapKey, { startedAt, count })

  if (windows.size > MAX_ENTRIES) {
    pruneWindows(now)
  }

  if (count > maxAttempts) {
    log.warn(
      {
        scope,
        key_fp: hashedKey.slice(0, 12),
        attempts: count,
        window_seconds: windowSeconds,
      },
      'auth.rate_limited'
    )
    throw new AppHttpError({
      code: 'auth/rate-limited',
      message: 'Too many attempts. Please wait a moment and try again.',
      httpStatus: 429,
    })
  }
}

function pruneWindows(now: number): void {
  for (const [mapKey, { startedAt }] of windows) {
    // Any window older than the longest limit in use is stale.
    if (now - startedAt >= 3600) {
      windows.delete(mapKey)
    }
  }
}

/** Clear all window state (test isolation only). */
export function resetRateLimits(): void {
  windows.clear()
}
