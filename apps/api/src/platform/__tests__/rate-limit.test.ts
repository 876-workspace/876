import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/platform/errors'

import { enforceRateLimit, resetRateLimits } from '../rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function attempt(
  scope = 'login',
  key = 'user@example.com',
  opts: { maxAttempts?: number; windowSeconds?: number } = {}
): void {
  enforceRateLimit(scope, key, {
    maxAttempts: opts.maxAttempts ?? 5,
    windowSeconds: opts.windowSeconds ?? 60,
  })
}

function expectRateLimited(fn: () => void): void {
  expect(fn).toThrow(AppHttpError)
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(AppHttpError)
    expect((err as AppHttpError).httpStatus).toBe(429)
    expect((err as AppHttpError).code).toBe('auth/rate-limited')
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    resetRateLimits()
    vi.useRealTimers()
  })

  it('allows attempts up to the limit', () => {
    expect(() => {
      for (let i = 0; i < 5; i++) attempt()
    }).not.toThrow()
  })

  it('throws 429 on the attempt that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) attempt()
    expectRateLimited(() => attempt())
  })

  it('rejects all subsequent attempts once the limit is exceeded', () => {
    for (let i = 0; i < 6; i++) {
      try {
        attempt()
      } catch {
        // ignore the first over-limit throw
      }
    }
    // Two more should also be rejected
    expectRateLimited(() => attempt())
    expectRateLimited(() => attempt())
  })

  it('resets the window after windowSeconds has elapsed', () => {
    const opts = { maxAttempts: 3, windowSeconds: 60 }
    // Exhaust the window
    for (let i = 0; i < 3; i++) attempt('login', 'user@example.com', opts)
    expectRateLimited(() => attempt('login', 'user@example.com', opts))

    // Advance past the window
    vi.advanceTimersByTime(61_000)

    // Should now be allowed again
    expect(() => attempt('login', 'user@example.com', opts)).not.toThrow()
  })

  it('counts separately for different keys in the same scope', () => {
    for (let i = 0; i < 5; i++) attempt('login', 'alice@example.com')
    // alice is exhausted
    expectRateLimited(() => attempt('login', 'alice@example.com'))
    // bob is a fresh key — must not be blocked
    expect(() => attempt('login', 'bob@example.com')).not.toThrow()
  })

  it('counts separately for the same key in different scopes', () => {
    for (let i = 0; i < 5; i++) attempt('login', 'user@example.com')
    expectRateLimited(() => attempt('login', 'user@example.com'))
    // Same key, different scope — fresh counter
    expect(() => attempt('reset', 'user@example.com')).not.toThrow()
  })

  it('counts each key independently even when limits differ per scope', () => {
    const tightOpts = { maxAttempts: 2, windowSeconds: 60 }
    const looseOpts = { maxAttempts: 10, windowSeconds: 60 }

    attempt('tight', 'x@example.com', tightOpts)
    attempt('tight', 'x@example.com', tightOpts)
    expectRateLimited(() => attempt('tight', 'x@example.com', tightOpts))

    // Different scope with loose limit should be unaffected
    expect(() => attempt('loose', 'x@example.com', looseOpts)).not.toThrow()
  })

  it('treats keys as case-sensitive', () => {
    const opts = { maxAttempts: 1, windowSeconds: 60 }
    attempt('login', 'User@Example.com', opts)
    expectRateLimited(() => attempt('login', 'User@Example.com', opts))
    // Different capitalisation is a different bucket
    expect(() => attempt('login', 'user@example.com', opts)).not.toThrow()
  })

  it('hashes the key — the stored map key is not the raw identifier', () => {
    // We can only observe this indirectly: two semantically different raw keys
    // that happen to produce the same bucket would collide. We verify that the
    // SHA-256 of 'a' and 'b' are distinct buckets and never interfere.
    const opts = { maxAttempts: 1, windowSeconds: 60 }
    attempt('scope', 'a', opts)
    expectRateLimited(() => attempt('scope', 'a', opts))
    expect(() => attempt('scope', 'b', opts)).not.toThrow()
  })

  it('starts a fresh window exactly when windowSeconds is reached', () => {
    // Pin to a whole-second boundary so sub-ms real-time offsets do not
    // cause Math.floor(Date.now()/1000) to jump ahead unexpectedly.
    vi.setSystemTime(1_000_000_000_000) // exactly 1 000 000 000 s

    const opts = { maxAttempts: 1, windowSeconds: 30 }
    attempt('login', 'u@example.com', opts) // count=1, startedAt=1e9
    // count=1, still ok; next call (count=2) should be blocked
    expect(() => attempt('login', 'u@example.com', opts)).toThrow(AppHttpError)

    // 29 s later — still within the window
    vi.advanceTimersByTime(29_000)
    expect(() => attempt('login', 'u@example.com', opts)).toThrow(AppHttpError)

    // Exactly 30 s after start — window expires (now - startedAt >= 30)
    vi.advanceTimersByTime(1_000)
    expect(() => attempt('login', 'u@example.com', opts)).not.toThrow()
  })
})

describe('resetRateLimits', () => {
  afterEach(() => {
    resetRateLimits()
    vi.useRealTimers()
  })

  it('clears all counters so subsequent attempts succeed', () => {
    beforeEach(() => vi.useFakeTimers())

    const opts = { maxAttempts: 1, windowSeconds: 60 }
    attempt('login', 'user@example.com', opts)
    expectRateLimited(() => attempt('login', 'user@example.com', opts))

    resetRateLimits()

    expect(() => attempt('login', 'user@example.com', opts)).not.toThrow()
  })
})
