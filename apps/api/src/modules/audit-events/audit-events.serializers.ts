import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { AuditEvent } from './audit-events.schemas'

export type AuditEventRow = {
  id: string
  event: string
  source: string
  appName: string
  appId: string | null
  userId: string | null
  path: string | null
  search: string | null
  referrer: string | null
  title: string | null
  requestId: string | null
  sessionId: string | null
  distinctId: string | null
  properties: unknown
  createdAt: bigint
}

export function serializeAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    object: 'audit_event',
    id: row.id,
    event: row.event,
    source: row.source,
    app_name: row.appName,
    app_id: row.appId,
    user_id: row.userId,
    path: row.path,
    search: row.search,
    referrer: row.referrer,
    title: row.title,
    request_id: row.requestId,
    session_id: row.sessionId,
    distinct_id: row.distinctId,
    // The column is `Json`, so a row written before a schema change — or by
    // another service — can hold a scalar or null. Anything that is not an
    // object serializes as `{}` rather than breaking the response contract.
    properties:
      typeof row.properties === 'object' &&
      row.properties !== null &&
      !Array.isArray(row.properties)
        ? (row.properties as Record<string, unknown>)
        : {},
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}
