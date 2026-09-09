import { getError } from '@876/core'

import { createSyncProvider } from '../../providers/sync/index.js'
import * as credentials from './sync-credentials.js'
import { providerError } from './sync-provider-errors.js'

export async function providerForConnection(connection: {
  provider: string
  credentialRef: string | null
  remoteAccountId: string | null
  caldavUrl: string | null
}) {
  if (
    connection.provider !== 'GOOGLE' &&
    connection.provider !== 'MICROSOFT' &&
    connection.provider !== 'CALDAV'
  )
    return getError('work/invalid-request')
  if (!connection.credentialRef)
    return getError('work/sync-provider-authorization-required')

  try {
    const credential = await credentials.resolve(connection.credentialRef)
    if (!credential)
      return getError('work/sync-provider-authorization-required')
    return createSyncProvider({
      provider: connection.provider,
      credential,
      remoteAccountId: connection.remoteAccountId,
      caldavUrl: connection.caldavUrl,
    })
  } catch (error) {
    return providerError(error) ?? getError('work/internal')
  }
}
