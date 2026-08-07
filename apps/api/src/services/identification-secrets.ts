import { createHmac } from 'node:crypto'

import { getSettings, type Settings } from '@/config'
import {
  getSecureFieldProvider,
  SecureFieldError,
  type SecureFieldProvider,
  type VaultClient,
} from '@/platform/secure-field'

/**
 * Sealing, masking and duplicate-matching for sensitive identifiers.
 *
 * Every write path goes through {@link sealIdentificationValue}, and every read
 * path outside the entitlement-gated disclosure route uses the stored
 * `valueLast4` rather than the plaintext. Keeping all three operations in one
 * module is the point: "how a TRN is stored" has exactly one implementation to
 * audit.
 */

export type SealedIdentification = {
  ciphertext: string
  keyId: string | null
  provider: string
  last4: string
  valueHash: string
}

/**
 * HMAC-SHA256 of the normalized value under the server pepper.
 *
 * A plain hash of a TRN is brute-forceable — the space is small enough to
 * enumerate — so the pepper is what stops a stolen database copy from being
 * reversed offline. It is keyed by type as well, so the same digits under two
 * identifier types do not collide into a false duplicate.
 */
export function computeIdentificationHash(
  identificationType: string,
  normalizedValue: string,
  settings: Settings = getSettings()
): string {
  const pepper = settings.crypto.identificationHashPepper
  if (!pepper)
    throw new SecureFieldError('IDENTIFICATION_HASH_PEPPER is not configured.')

  return createHmac('sha256', pepper)
    .update(`${identificationType}:${normalizedValue}`, 'utf8')
    .digest('hex')
}

export async function sealIdentificationValue(params: {
  userId: string
  identificationType: string
  normalizedValue: string
  settings?: Settings
  vaultClient?: VaultClient | null
  provider?: SecureFieldProvider
}): Promise<SealedIdentification> {
  const settings = params.settings ?? getSettings()
  // The provider reads its own configuration; only the vault client is passed.
  const provider =
    params.provider ?? getSecureFieldProvider(params.vaultClient ?? null)

  const sealed = await provider.seal(params.normalizedValue, {
    user_id: params.userId,
    type: params.identificationType,
  })

  return {
    ciphertext: sealed.ciphertext,
    keyId: sealed.keyId,
    provider: sealed.provider,
    last4: params.normalizedValue.slice(-4),
    valueHash: computeIdentificationHash(
      params.identificationType,
      params.normalizedValue,
      settings
    ),
  }
}

/** A stored identification row, as much of it as unsealing needs. */
export type IdentificationRow = {
  userId: string
  type: string
  valueCiphertext: string | null
  valueKeyId: string | null
  valueProvider: string | null
  /** Legacy plaintext, present only on rows predating encryption. */
  value?: string | null
  valueLast4?: string | null
}

/**
 * The raw value. **Only the entitlement-gated disclosure route may call this.**
 *
 * Rows that predate encryption still carry plaintext in `value`; they are
 * returned as-is so disclosure keeps working through the backfill window.
 */
export async function discloseIdentificationValue(
  row: IdentificationRow,
  options: {
    vaultClient?: VaultClient | null
    provider?: SecureFieldProvider
  } = {}
): Promise<string> {
  if (!row.valueCiphertext) {
    if (row.value) return String(row.value)
    throw new SecureFieldError('The identification has no stored value.')
  }

  const provider =
    options.provider ?? getSecureFieldProvider(options.vaultClient ?? null)

  return provider.unseal(
    {
      ciphertext: row.valueCiphertext,
      keyId: row.valueKeyId,
      provider: row.valueProvider ?? '',
    },
    { user_id: row.userId, type: row.type }
  )
}

const MASK_WIDTH = 4

/**
 * The only value shape a list or retrieve response may carry.
 *
 * Reveals the last three characters behind a **fixed-width** mask. The width is
 * deliberately not the length of the value: a bullet run as long as the value
 * discloses the identifier's length, which is itself a distinguishing detail —
 * a nine-digit TRN and a six-character passport should not be told apart from a
 * masked read.
 *
 * Uses the stored last four, so masking never needs the decryption key, and
 * falls back to the legacy plaintext while un-backfilled rows exist.
 */
export function maskedIdentificationValue(row: IdentificationRow): string {
  let last4 = row.valueLast4
  if (!last4) {
    if (!row.value) return ''
    last4 = String(row.value).slice(-4)
  }

  return `${'•'.repeat(MASK_WIDTH)}${String(last4).slice(-3)}`
}
