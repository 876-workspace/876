import type { ApiKeyRecord } from '@/http/auth'

import * as repository from './apps.repository'

/**
 * Business logic for registered apps and their credentials.
 *
 * Key *validity* — revoked, expired, unknown — is decided in the HTTP auth
 * guard rather than here, deliberately: every rejection reason is logged from
 * one place, so an operator reading `api_key.rejected` sees the whole picture
 * without correlating two layers. What this module owns is the record itself.
 */

export function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  return repository.findApiKeyByHash(keyHash)
}

export function markApiKeyUsed(apiKeyId: string, at: number): Promise<void> {
  return repository.markApiKeyUsed(apiKeyId, at)
}
