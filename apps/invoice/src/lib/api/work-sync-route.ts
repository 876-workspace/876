import 'server-only'

import type {
  WorkSyncConnection,
  WorkSyncConnectionSummary,
} from '@876/work'

/** Removes server-only credential/account/cursor fields before Invoice responds. */
export function serializeWorkSyncConnection(
  value: WorkSyncConnection
): WorkSyncConnectionSummary | null {
  if (
    value.provider !== 'GOOGLE' &&
    value.provider !== 'MICROSOFT' &&
    value.provider !== 'CALDAV'
  )
    return null

  return {
    object: 'sync_connection_summary',
    id: value.id,
    provider: value.provider,
    status: value.status,
    authorized: value.credentialRef !== null && value.status !== 'REVOKED',
    remoteAccountLabel: value.remoteAccountLabel,
    caldavUrl: value.provider === 'CALDAV' ? value.caldavUrl : null,
    lastSyncedAt: value.lastSyncedAt,
    lastErrorCode: value.lastErrorCode,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}
