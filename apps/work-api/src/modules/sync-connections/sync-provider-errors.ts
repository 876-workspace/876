import { getError } from '@876/core'

import { WorkSyncProviderError } from '../../providers/sync/index.js'

export function providerError(error: unknown) {
  if (!(error instanceof WorkSyncProviderError)) return null

  switch (error.code) {
    case 'credential-unavailable':
    case 'provider-unauthorized':
      return getError('work/sync-provider-authorization-required')
    case 'provider-rate-limited':
      return getError('work/sync-provider-rate-limited')
    case 'provider-unavailable':
      return getError('work/sync-provider-unavailable')
    case 'provider-invalid-response':
      return getError('work/sync-provider-invalid-response')
    case 'provider-not-configured':
      return getError('work/sync-provider-not-configured')
    case 'resource-unsupported':
      return getError('work/invalid-request')
    case 'provider-cursor-invalid':
      return getError('work/sync-provider-invalid-response')
  }
}
