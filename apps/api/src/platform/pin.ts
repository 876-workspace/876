/**
 * Account PIN hashing and policy.
 *
 * A PIN is not a password: four to eight digits is at most 100 million
 * candidates, and realistically far fewer because people pick birthdays and
 * repeats. Two things compensate, and both are required — an expensive KDF so
 * offline cracking of a stolen hash is slow, and a lockout so online guessing
 * cannot simply iterate.
 *
 * ## Two deliberate differences from `core/pin.py`
 *
 * 1. **Hashing is asynchronous here.** Python's `hashlib.scrypt` is synchronous
 *    and each call holds a worker for the ~100ms it takes. Doing that on Node's
 *    single event loop would stall every other in-flight request for the same
 *    window, so this module uses `crypto.scrypt`, which runs on the libuv
 *    threadpool. The stored format and the derived bytes are identical — a hash
 *    written by either service verifies against the other, which
 *    `__tests__/pin.test.ts` asserts against a Python-generated fixture.
 *
 * 2. **`isDigit` is ASCII-only.** Python's `str.isdigit()` also accepts
 *    Arabic-Indic digits, superscripts, and other Unicode digit forms, so
 *    `'٤٤٤٥'` passes validation there. That is a latent bug rather than a
 *    feature: it cannot round-trip through a numeric keypad. Rejecting it
 *    cannot invalidate a stored hash, because verification never re-validates.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>

export const SCRYPT_N = 2 ** 15
export const SCRYPT_R = 8
export const SCRYPT_P = 1

const SALT_BYTES = 16
const KEY_LEN = 32

/**
 * scrypt needs roughly `128 * N * r` bytes — 32 MiB at these parameters, which
 * is exactly the default cap, so it must be raised explicitly or every hash
 * fails with "memory limit exceeded".
 */
const MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2

export const MIN_LENGTH = 4
export const MAX_LENGTH = 8

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_SECONDS = 900

/** Repeats and straight runs are the first guesses anyone makes. */
const TRIVIAL_PINS = new Set([
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
])

/** The proposed PIN is not acceptable. The message is safe to show a user. */
export class PinPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PinPolicyError'
  }
}

function isSequential(pin: string): boolean {
  let ascending = true
  let descending = true

  for (let index = 1; index < pin.length; index += 1) {
    const step = pin.charCodeAt(index) - pin.charCodeAt(index - 1)
    if (step !== 1) ascending = false
    if (step !== -1) descending = false
  }

  return ascending || descending
}

/** Every 4-to-8 digit substring of a date of birth, in any common order. */
function digitRuns(value: string): Set<string> {
  const digits = value.replace(/\D/g, '')
  const runs = new Set<string>()

  for (let start = 0; start < digits.length; start += 1) {
    const last = Math.min(digits.length, start + MAX_LENGTH)
    for (let end = start + MIN_LENGTH; end <= last; end += 1) {
      runs.add(digits.slice(start, end))
    }
  }

  return runs
}

/**
 * Throws {@link PinPolicyError} when the PIN is unacceptable.
 *
 * Rejecting the user's own date of birth matters more than it looks: it is the
 * single most common real-world PIN, and it is derivable from data the platform
 * already stores about them.
 */
export function validatePin(
  pin: string,
  opts: { dateOfBirth?: string | null } = {}
): void {
  if (!/^[0-9]+$/.test(pin))
    throw new PinPolicyError('A PIN must contain digits only.')

  if (pin.length < MIN_LENGTH || pin.length > MAX_LENGTH) {
    throw new PinPolicyError(
      `A PIN must be between ${MIN_LENGTH} and ${MAX_LENGTH} digits.`
    )
  }

  if (new Set(pin).size === 1) {
    throw new PinPolicyError('A PIN must not be a single repeated digit.')
  }

  if (TRIVIAL_PINS.has(pin) || isSequential(pin)) {
    throw new PinPolicyError('A PIN must not be a simple sequence.')
  }

  if (opts.dateOfBirth && digitRuns(opts.dateOfBirth).has(pin)) {
    throw new PinPolicyError('A PIN must not be based on your date of birth.')
  }
}

/** `scrypt$n$r$p$salt$hash`, all base64, salt generated per row. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(pin, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  })

  return [
    'scrypt',
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$')
}

/**
 * Constant-time comparison against a stored hash.
 *
 * Parameters are read back from the stored string rather than the constants
 * above, so raising the cost later does not invalidate existing hashes.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6) return false

  const [algorithm, rawN, rawR, rawP, saltB64, hashB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ]
  if (algorithm !== 'scrypt') return false

  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (!isPositiveInteger(n) || !isPositiveInteger(r) || !isPositiveInteger(p))
    return false

  const salt = decodeBase64(saltB64)
  const expected = decodeBase64(hashB64)
  if (!salt || !expected || expected.length === 0) return false

  let derived: Buffer
  try {
    derived = await scrypt(pin, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    })
  } catch {
    // A stored record with absurd parameters must not crash the request that
    // read it — an unverifiable hash is a failed verification, not a 500.
    return false
  }

  return timingSafeEqual(derived, expected)
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * Decode base64 strictly.
 *
 * Node's decoder is lenient where Python's `binascii` raises, so a corrupt
 * stored field would otherwise decode to arbitrary truncated bytes and be
 * compared as though it were real. Re-encoding and comparing is what makes the
 * rejection explicit.
 */
function decodeBase64(value: string): Buffer | null {
  const decoded = Buffer.from(value, 'base64')
  return decoded.toString('base64') === value ? decoded : null
}

export function isLocked(
  lockedUntil: number | null | undefined,
  now: number
): boolean {
  return lockedUntil !== null && lockedUntil !== undefined && lockedUntil > now
}
