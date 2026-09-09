import { WorkOS } from '@workos-inc/node'
import type { VaultClient } from '@876/core/crypto/secure-field'

let cached: VaultClient | null | undefined

function vaultEnabled() {
  return process.env.WORKOS_VAULT_ENABLED?.trim().toLowerCase() === 'true'
}

export function getVaultClient(): VaultClient | null {
  if (cached !== undefined) return cached

  const apiKey = process.env.WORKOS_API_KEY?.trim()
  if (!vaultEnabled() || !apiKey) {
    cached = null
    return cached
  }

  const vault = new WorkOS(apiKey).vault
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
