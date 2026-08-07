/**
 * Shared phone-number primitives.
 *
 * Neutral home for E.164 normalization so the mobile-number domain and the
 * communications domain can both use them without importing each other.
 * `domains/communications` already depends on `domains/mobile_numbers`; putting
 * either of these in a module makes that a cycle the moment the other side needs it.
 */

import { AppHttpError } from '@/platform/errors'

const E164 = /^\+[1-9][0-9]{7,14}$/

function invalidPhone(): AppHttpError {
  return new AppHttpError({
    code: 'communications/invalid-phone-number',
    message: 'Enter a valid international phone number.',
    httpStatus: 400,
  })
}

/**
 * Normalize international E.164-compatible inputs.
 *
 * This is the free, synchronous, offline path. It stays authoritative for
 * input-time feedback and for normalization on write; Twilio Lookup is the
 * authoritative validity check at submission time, and wins where they differ.
 *
 * Throws {@link AppHttpError} with code `communications/invalid-phone-number`
 * for inputs that cannot be normalized to E.164.
 */
export function normalizePhoneNumber(value: string): string {
  const stripped = value.trim()
  if (!stripped.startsWith('+') || !/^\+?[\d\s().-]+$/.test(stripped)) {
    throw invalidPhone()
  }

  const digits = stripped.replace(/\D/g, '')
  const normalized = `+${digits}`
  if (!E164.test(normalized)) {
    throw invalidPhone()
  }

  return normalized
}
