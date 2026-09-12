/**
 * Sealing for payment credentials.
 *
 * The providers live in `@876/core/crypto/secure-field`, shared with the core
 * identity service, so a credential sealed here and an identification sealed
 * there carry the same format and the same guarantee. This module is only the
 * binding to Billing's settings, plus the two facts that are specific to
 * Billing:
 *
 * 1. **The key context is scoped per tenant.** One workspace's compromise or
 *    rotation must not reach another's credentials.
 * 2. **The associated data names the row**: `{ tenant_id, payment_method_id,
 *    type }`. A ciphertext copied onto another payment method — or another
 *    tenant's — fails to decrypt instead of disclosing a card under the wrong
 *    owner.
 *
 * A card or provider credential is unsealed only on the path that hands it
 * straight to a processor, and no route ever returns one. The one disclosure
 * route is a tenant's own deposit account number (`bank_account_number`), which
 * the organization legitimately needs to read back — for example to print its
 * payment instructions — and which is gated on `banking:write` and logged.
 */

import {
  resolveSecureFieldProvider,
  type SecureFieldContext,
  type SecureFieldProvider,
  type VaultClient,
} from '@876/core/crypto/secure-field'

import { getSettings } from '@/config'

export {
  LOCAL_AESGCM_PREFIX,
  providerForCiphertext,
  SecureFieldError,
  WORKOS_VAULT_PREFIX,
  type SealedValue,
  type SecureFieldContext,
  type SecureFieldProvider,
  type VaultClient,
} from '@876/core/crypto/secure-field'

/** The credential kinds Billing is allowed to seal. Never a CVV or a PIN. */
export type SealedCredentialType =
  'card_pan' | 'bank_account_number' | 'provider_token'

/**
 * Build the authenticated associated data for one credential row.
 *
 * Exported because the repository and the disclosure path must produce byte-
 * identical context; deriving it in two places is how a value becomes
 * undecryptable six months later.
 */
export function credentialContext(params: {
  tenantId: string
  paymentMethodId: string
  type: SealedCredentialType
}): SecureFieldContext {
  return {
    tenant_id: params.tenantId,
    payment_method_id: params.paymentMethodId,
    type: params.type,
  }
}

/**
 * Associated data for a tenant bank account's sealed account number. Shared by
 * the write and disclosure paths for the same byte-identity reason as above.
 */
export function bankAccountNumberContext(params: {
  tenantId: string
  bankAccountId: string
}): SecureFieldContext {
  return {
    tenant_id: params.tenantId,
    bank_account_id: params.bankAccountId,
    type: 'bank_account_number',
  }
}

export function getSecureFieldProvider(
  tenantId: string,
  vaultClient: VaultClient | null = null
): SecureFieldProvider {
  const settings = getSettings()

  return resolveSecureFieldProvider(
    {
      vaultEnabled: settings.workos.vaultEnabled,
      // Per-tenant key isolation: a rotation or a compromise is bounded to one
      // workspace rather than the whole platform.
      vaultKeyContext: `${settings.workos.vaultKeyContext}/${tenantId}`,
      secureFieldKey: settings.secureFieldKey,
    },
    vaultClient
  )
}
