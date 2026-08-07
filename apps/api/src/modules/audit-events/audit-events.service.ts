import { listObject, type ListObject } from '@/http/envelope'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './audit-events.repository'
import type {
  AuditEvent,
  CreateAuditEventBody,
  ListAuditEventsQuery,
} from './audit-events.schemas'
import { serializeAuditEvent } from './audit-events.serializers'

/**
 * The platform audit and client-telemetry trail.
 */

/**
 * Record one event.
 *
 * `appId` is the app the *credential* belongs to, passed in by the controller
 * from the validated principal — never a field the client can set. A caller must
 * not be able to attribute its telemetry to another app.
 */
export async function createAuditEvent(
  body: CreateAuditEventBody,
  appId: string | null
): Promise<AuditEvent> {
  const row = await repository.create({
    id: generateId('auditEvent'),
    event: body.event,
    source: body.source,
    appName: body.app_name,
    appId,
    userId: body.user_id,
    path: body.path,
    search: body.search,
    referrer: body.referrer,
    title: body.title,
    requestId: body.request_id,
    sessionId: body.session_id,
    distinctId: body.distinct_id,
    properties: body.properties,
    createdAt: nowUnixSeconds(),
  })

  return serializeAuditEvent(row)
}

export async function listAuditEvents(
  query: ListAuditEventsQuery
): Promise<ListObject<AuditEvent>> {
  const { data, hasMore, totalCount } = await repository.list(query)

  return listObject({
    data: data.map(serializeAuditEvent),
    hasMore,
    url: '/audit-events',
    totalCount,
  })
}
