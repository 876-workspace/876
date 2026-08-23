/**
 * The WorkOS Vault client, as this service uses it.
 *
 * `@workos-inc/node`'s `vault` surface already matches the `VaultClient`
 * contract in `@876/core/crypto/secure-field` — `encrypt(data, keyContext,
 * associatedData)` and `decrypt(blob, associatedData)` — so this module is a
 * lazily-constructed, narrowed handle rather than a wrapper. Narrowing matters:
 * it keeps `createObject` / `readObject` out of reach, so a credential can only
 * ever be sealed into a column we control, never parked in Vault storage this
 * service cannot enumerate or delete.
 *
 * It is lazy because the SDK reads its key at construction and every module in
 * this service is imported during the container build, when runtime secrets are
 * deliberately absent.
 */

import { WorkOS } from '@workos-inc/node'
import type { VaultClient } from '@876/core/crypto/secure-field'

import { getSettings } from '@/config'

let cached: VaultClient | null | undefined

/**
 * The Vault client, or `null` when Vault is not configured for this
 * environment.
 *
 * Returning `null` rather than throwing is deliberate: the provider resolver
 * then falls back to the local key in development, and raises loudly on seal if
 * neither is configured. What must never happen is a silent plaintext write,
 * and that case is owned by the resolver, not by this module.
 */
export function getVaultClient(): VaultClient | null {
  if (cached !== undefined) return cached

  const { workos } = getSettings()
  if (!workos.vaultEnabled || !workos.apiKey) {
    cached = null
    return cached
  }

  const vault = new WorkOS(workos.apiKey).vault

  cached = {
    encrypt: (data, context, associatedData) =>
      vault.encrypt(data, context, associatedData),
    decrypt: (encryptedData, associatedData) =>
      vault.decrypt(encryptedData, associatedData),
  }

  return cached
}

export function resetVaultClientForTest(): void {
  cached = undefined
}
