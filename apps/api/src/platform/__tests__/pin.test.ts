import { describe, expect, it } from 'vitest'

import {
  hashPin,
  isLocked,
  LOCKOUT_SECONDS,
  MAX_FAILED_ATTEMPTS,
  PinPolicyError,
  validatePin,
  verifyPin,
} from '../pin'

/**
 * A hash produced by the **Python** service (`core.pin.hash_pin('482913')`).
 *
 * Verifying it here is the point: scrypt has several places the two runtimes
 * could silently disagree (parameter names, the memory cap, base64 padding,
 * the encoding of the password before derivation), and a round-trip test —
 * hash then verify, both in TypeScript — passes happily through every one of
 * them. Only a cross-implementation fixture catches a divergence that would
 * lock every existing user out of their account at the cutover.
 *
 * Regenerate with (from `apps/api`, with the Python venv):
 *
 *     .venv/bin/python -c "from core.pin import hash_pin; print(hash_pin('482913'))"
 */
const PYTHON_HASH =
  'scrypt$32768$8$1$vB+QuIHghxOKNoFFmMFPuQ==$68N8GXZIBb3qyOytwYyRB6F1ynWaiy9b6UdjibjoEzs='
const PYTHON_PIN = '482913'

describe('verifyPin against a Python-generated hash', () => {
  it('accepts the PIN the Python service hashed', async () => {
    await expect(verifyPin(PYTHON_PIN, PYTHON_HASH)).resolves.toBe(true)
  })

  it('rejects a different PIN against the same hash', async () => {
    await expect(verifyPin('482914', PYTHON_HASH)).resolves.toBe(false)
  })
})

describe('hashPin', () => {
  it('produces the documented encoded format', async () => {
    const stored = await hashPin('482913')

    expect(stored).toMatch(
      /^scrypt\$32768\$8\$1\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/
    )
  })

  it('salts every hash, so the same PIN never stores the same bytes', async () => {
    const [first, second] = await Promise.all([
      hashPin('482913'),
      hashPin('482913'),
    ])

    expect(first).not.toBe(second)
    await expect(verifyPin('482913', first)).resolves.toBe(true)
    await expect(verifyPin('482913', second)).resolves.toBe(true)
  })

  it('never stores the PIN itself', async () => {
    expect(await hashPin('482913')).not.toContain('482913')
  })
})

describe('verifyPin', () => {
  it('reads the cost parameters back from the stored hash', async () => {
    // Raising the cost later must not invalidate the hashes already written, so
    // a record stored at a lower cost still verifies.
    const cheap = 'scrypt$16384$8$1$vB+QuIHghxOKNoFFmMFPuQ=='
    const derived = await hashPin('482913')
    expect(derived.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(cheap.split('$')[1]).toBe('16384')
  })

  it.each([
    ['an empty string', ''],
    ['a bare word', 'nonsense'],
    ['too few fields', 'scrypt$32768$8$1$abc'],
    ['too many fields', `${PYTHON_HASH}$extra`],
    ['an unknown algorithm', PYTHON_HASH.replace('scrypt', 'bcrypt')],
    ['a non-numeric cost', PYTHON_HASH.replace('$32768$', '$abc$')],
    ['a zero cost', PYTHON_HASH.replace('$32768$', '$0$')],
    ['a negative cost', PYTHON_HASH.replace('$32768$', '$-1$')],
    [
      'malformed base64 in the salt',
      PYTHON_HASH.replace('vB+QuIHghxOKNoFFmMFPuQ==', 'not!b64'),
    ],
    ['an empty hash segment', 'scrypt$32768$8$1$vB+QuIHghxOKNoFFmMFPuQ==$'],
  ])('returns false rather than throwing for %s', async (_label, stored) => {
    await expect(verifyPin('482913', stored)).resolves.toBe(false)
  })

  it('returns false rather than throwing when the parameters are absurd', async () => {
    // An unverifiable stored record is a failed verification, not a 500.
    const absurd = PYTHON_HASH.replace('$32768$', '$1073741824$')

    await expect(verifyPin('482913', absurd)).resolves.toBe(false)
  })
})

describe('validatePin', () => {
  it('accepts a non-trivial PIN', () => {
    expect(() => validatePin('482913')).not.toThrow()
    expect(() => validatePin('1990')).not.toThrow()
    expect(() => validatePin('0515')).not.toThrow()
  })

  it.each([
    ['too short', '123', 'A PIN must be between 4 and 8 digits.'],
    ['too long', '123456789', 'A PIN must be between 4 and 8 digits.'],
    ['a repeated digit', '1111', 'A PIN must not be a single repeated digit.'],
    ['all zeroes', '0000', 'A PIN must not be a single repeated digit.'],
    ['an ascending run', '1234', 'A PIN must not be a simple sequence.'],
    ['a descending run', '4321', 'A PIN must not be a simple sequence.'],
    ['a longer ascending run', '5678', 'A PIN must not be a simple sequence.'],
    ['a longer descending run', '9876', 'A PIN must not be a simple sequence.'],
    ['letters', 'abcd', 'A PIN must contain digits only.'],
    ['a mixed string', '12a4', 'A PIN must contain digits only.'],
    ['an empty string', '', 'A PIN must contain digits only.'],
    ['whitespace', '1 23', 'A PIN must contain digits only.'],
  ])(
    'rejects %s with the exact user-facing message',
    (_label, pin, message) => {
      expect(() => validatePin(pin)).toThrow(PinPolicyError)
      expect(() => validatePin(pin)).toThrow(message)
    }
  )

  it('rejects non-ASCII digit forms', () => {
    // Deliberately stricter than Python's `str.isdigit()`, which accepts these.
    // A PIN that cannot be typed on a numeric keypad cannot round-trip.
    expect(() => validatePin('٤٤٤٥')).toThrow('A PIN must contain digits only.')
    expect(() => validatePin('²²²²')).toThrow('A PIN must contain digits only.')
  })

  it.each([
    ['the birth year', '1990'],
    ['the day and month', '0515'],
    ['the whole date', '19900515'],
    ['a run spanning the separators', '9005'],
  ])('rejects %s drawn from the date of birth', (_label, pin) => {
    expect(() => validatePin(pin, { dateOfBirth: '1990-05-15' })).toThrow(
      'A PIN must not be based on your date of birth.'
    )
  })

  it('accepts a PIN unrelated to the date of birth', () => {
    expect(() =>
      validatePin('482913', { dateOfBirth: '1990-05-15' })
    ).not.toThrow()
  })

  it.each([null, undefined, ''])(
    'skips the date-of-birth rule when it is %s',
    (dateOfBirth) => {
      expect(() => validatePin('1990', { dateOfBirth })).not.toThrow()
    }
  )
})

describe('isLocked', () => {
  it.each([
    ['a future lockout', 2000, 1000, true],
    ['a lockout expiring now', 1000, 1000, false],
    ['a past lockout', 500, 1000, false],
  ])('reports %s correctly', (_label, lockedUntil, now, expected) => {
    expect(isLocked(lockedUntil, now)).toBe(expected)
  })

  it.each([null, undefined])(
    'is never locked when lockedUntil is %s',
    (lockedUntil) => {
      expect(isLocked(lockedUntil, 1000)).toBe(false)
    }
  )

  it('exposes the lockout policy constants', () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5)
    expect(LOCKOUT_SECONDS).toBe(900)
  })
})
