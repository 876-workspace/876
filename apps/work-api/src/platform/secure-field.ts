import {
  resolveSecureFieldProvider,
  type SecureFieldContext,
  type SecureFieldProvider,
  type VaultClient,
} from '@876/core/crypto/secure-field'

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

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true'
}

export function syncCredentialContext(params: {
  tenantId: string
  connectionId: string
  provider: string
}): SecureFieldContext {
  return {
    tenant_id: params.tenantId,
    work_sync_connection_id: params.connectionId,
    provider: params.provider,
    type: 'calendar_sync_credential',
  }
}

export function getSyncSecureFieldProvider(
  tenantId: string,
  vaultClient: VaultClient | null = null
): SecureFieldProvider {
  const keyContext =
    process.env.WORKOS_VAULT_KEY_CONTEXT?.trim() || '876/work-sync'

  return resolveSecureFieldProvider(
    {
      vaultEnabled: enabled(process.env.WORKOS_VAULT_ENABLED),
      vaultKeyContext: `${keyContext}/${tenantId}`,
      secureFieldKey: process.env.SECURE_FIELD_KEY?.trim() || undefined,
    },
    vaultClient
  )
}
