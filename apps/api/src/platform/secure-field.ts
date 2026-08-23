/**
 * Envelope encryption for individual sensitive columns.
 *
 * The providers themselves live in `@876/core/crypto/secure-field` so that every
 * service sealing a field — core identity here, payment credentials in Billing —
 * produces the same ciphertext format under the same authenticated context. This
 * module is only the binding to *this* service's settings.
 *
 * The `context` map is **authenticated associated data**, not metadata. Here it
 * is always `{ user_id, type }`, which binds the ciphertext to the row that owns
 * it: a value copied onto another user's record fails to decrypt rather than
 * silently disclosing under the wrong identity.
 */

import {
  resolveSecureFieldProvider,
  type SecureFieldProvider,
  type VaultClient,
  type VaultKeyContext,
} from '@876/core/crypto/secure-field'

import { getSettings } from '@/config'

export {
  LOCAL_AESGCM_PREFIX,
  LocalAesGcmProvider,
  providerForCiphertext,
  SecureFieldError,
  WORKOS_VAULT_PREFIX,
  WorkOSVaultProvider,
  type SealedValue,
  type SecureFieldContext,
  type SecureFieldProvider,
  type VaultClient,
  type VaultKeyContext,
} from '@876/core/crypto/secure-field'

export function getSecureFieldProvider(
  vaultClient: VaultClient | null = null
): SecureFieldProvider {
  const { workos, crypto } = getSettings()

  return resolveSecureFieldProvider(
    {
      vaultEnabled: workos.vaultEnabled,
      vaultKeyContext: workos.vaultKeyContext,
      secureFieldKey: crypto.secureFieldKey,
    },
    vaultClient
  )
}
