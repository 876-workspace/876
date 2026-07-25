import type { AnalyticsProperties } from './types'

export type AnalyticsAuditEventCreateParams = {
  event: string
  source: 'client'
  appName: string
  userId: string | null
  path: string | null
  search: string | null
  referrer: string | null
  title: string | null
  requestId: string | null
  distinctId: string | null
  properties: AnalyticsProperties
}

export type AuditEventMirrorConfig<TEvent extends string> = {
  appName: string
  enabled?: boolean
  events: readonly TEvent[]
  createEvent: (
    params: AnalyticsAuditEventCreateParams
  ) => void | Promise<unknown>
  userIdProperty?: string
}

export function createAuditEventMirror<TEvent extends string>({
  appName,
  enabled = true,
  events,
  createEvent,
  userIdProperty = 'user_id',
}: AuditEventMirrorConfig<TEvent>) {
  const mirroredEvents = new Set<TEvent>(events)

  return function mirrorAuditEvent(
    event: TEvent,
    properties: AnalyticsProperties
  ): void {
    if (!enabled || !mirroredEvents.has(event)) return

    void createEvent({
      event,
      source: 'client',
      appName,
      userId: readString(properties[userIdProperty]),
      path: readString(properties.path),
      search: readString(properties.search),
      referrer: readString(properties.referrer),
      title: readString(properties.title ?? properties.page_title),
      requestId: readString(properties.request_id),
      distinctId: readString(properties.distinct_id),
      properties,
    })
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}
