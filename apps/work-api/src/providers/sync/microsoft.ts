import {
  providerFetch,
  providerJson,
  providerResponse,
  requireHttpsProviderUrl,
} from './http.js'
import {
  WorkSyncProviderError,
  type WorkPullInput,
  type WorkPullResult,
  type WorkRemoteCalendar,
  type WorkRemoteEvent,
  type WorkSyncCredential,
  type WorkSyncProviderAdapter,
} from './provider.js'
import { remoteEventSchema } from './remote-event.js'

const GRAPH_ORIGIN = 'https://graph.microsoft.com'
const GRAPH_API = `${GRAPH_ORIGIN}/v1.0`

type GraphCalendarPage = {
  value?: Array<{
    id?: string
    name?: string
    color?: string
    canEdit?: boolean
    isDefaultCalendar?: boolean
  }>
  '@odata.nextLink'?: string
}

type GraphEvent = {
  id?: string
  '@odata.etag'?: string
  iCalUId?: string
  subject?: string
  bodyPreview?: string
  body?: { content?: string; contentType?: string }
  location?: { displayName?: string }
  showAs?: string
  isAllDay?: boolean
  isCancelled?: boolean
  lastModifiedDateTime?: string
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
  '@removed'?: { reason?: string }
}

type GraphDeltaPage = {
  value?: GraphEvent[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

type MicrosoftTokenResponse = {
  access_token?: string
  expires_in?: number
  token_type?: string
}

function config() {
  const clientId = process.env.WORK_MICROSOFT_CLIENT_ID?.trim()
  const clientSecret = process.env.WORK_MICROSOFT_CLIENT_SECRET?.trim()
  const tenant = process.env.WORK_MICROSOFT_TENANT?.trim() || 'common'
  if (!clientId || !clientSecret)
    throw new WorkSyncProviderError(
      'provider-not-configured',
      'Microsoft Calendar synchronization is not configured.'
    )
  return { clientId, clientSecret, tenant }
}

function graphLink(value: string) {
  const url = requireHttpsProviderUrl(value, GRAPH_ORIGIN)
  if (!url.pathname.startsWith('/v1.0/'))
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'Microsoft Graph returned an unexpected synchronization URL.'
    )
  return url.toString()
}

function epoch(value: string | undefined) {
  if (!value) return null
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null
}

function normalizeGraphEvent(value: GraphEvent): WorkRemoteEvent {
  const remoteId = value.id?.trim()
  if (!remoteId)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'Microsoft Graph returned an event without an id.'
    )

  const deleted = Boolean(value['@removed'])
  const allDay = value.isAllDay === true
  const event: WorkRemoteEvent = {
    remoteId,
    etag: value['@odata.etag'] ?? null,
    iCalUid: value.iCalUId ?? null,
    title: value.subject ?? '(Untitled)',
    description: value.body?.content ?? value.bodyPreview ?? null,
    location: value.location?.displayName ?? null,
    status: value.isCancelled ? 'CANCELLED' : 'CONFIRMED',
    busyStatus: value.showAs === 'free' ? 'FREE' : 'BUSY',
    allDay,
    updatedAt: epoch(value.lastModifiedDateTime),
    deleted,
  }

  if (deleted) return event

  if (allDay) {
    event.startDate = value.start?.dateTime?.slice(0, 10) ?? null
    event.endDate = value.end?.dateTime?.slice(0, 10) ?? null
  } else {
    event.startAt = epoch(value.start?.dateTime)
    event.endAt = epoch(value.end?.dateTime)
    event.timeZone = 'UTC'
  }

  return remoteEventSchema.parse(event)
}

function graphEventBody(event: WorkRemoteEvent) {
  const body: Record<string, unknown> = {
    subject: event.title,
    body: {
      contentType: 'text',
      content: event.description ?? '',
    },
    location: { displayName: event.location ?? '' },
    showAs: event.busyStatus === 'FREE' ? 'free' : 'busy',
    isAllDay: event.allDay,
  }

  if (event.allDay) {
    body.start = { dateTime: `${event.startDate}T00:00:00`, timeZone: 'UTC' }
    body.end = { dateTime: `${event.endDate}T00:00:00`, timeZone: 'UTC' }
  } else {
    body.start = {
      dateTime: new Date((event.startAt ?? 0) * 1000)
        .toISOString()
        .replace(/Z$/, ''),
      timeZone: 'UTC',
    }
    body.end = {
      dateTime: new Date((event.endAt ?? 0) * 1000)
        .toISOString()
        .replace(/Z$/, ''),
      timeZone: 'UTC',
    }
  }

  return body
}

export class MicrosoftCalendarAdapter implements WorkSyncProviderAdapter {
  readonly provider = 'MICROSOFT' as const
  readonly #credential: WorkSyncCredential
  #token: { value: string; expiresAt: number } | null = null

  constructor(credential: WorkSyncCredential) {
    this.#credential = credential
  }

  async #accessToken() {
    const now = Math.floor(Date.now() / 1000)
    if (this.#token && this.#token.expiresAt > now + 60)
      return this.#token.value
    if (
      this.#credential.accessToken &&
      (!this.#credential.expiresAt || this.#credential.expiresAt > now + 60)
    )
      return this.#credential.accessToken

    const refreshToken = this.#credential.refreshToken
    if (!refreshToken)
      throw new WorkSyncProviderError(
        'credential-unavailable',
        'Microsoft Calendar refresh credentials are unavailable.'
      )

    const { clientId, clientSecret, tenant } = config()
    const response = await providerResponse(
      `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'offline_access openid profile email Calendars.ReadWrite',
        }),
      },
      'Microsoft OAuth could not be reached.'
    )

    if (!response.ok)
      throw new WorkSyncProviderError(
        response.status === 400 || response.status === 401
          ? 'provider-unauthorized'
          : 'provider-unavailable',
        'Microsoft Calendar authorization could not be refreshed.'
      )

    let token: MicrosoftTokenResponse
    try {
      token = (await response.json()) as MicrosoftTokenResponse
    } catch {
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Microsoft OAuth returned invalid JSON.'
      )
    }

    if (!token.access_token)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Microsoft OAuth did not return an access token.'
      )

    this.#token = {
      value: token.access_token,
      expiresAt: now + Math.max(60, token.expires_in ?? 3600),
    }
    return this.#token.value
  }

  async #headers(extra: HeadersInit = {}) {
    return {
      authorization: `Bearer ${await this.#accessToken()}`,
      accept: 'application/json',
      Prefer: 'outlook.timezone="UTC"',
      ...extra,
    }
  }

  async calendars(): Promise<WorkRemoteCalendar[]> {
    const calendars: WorkRemoteCalendar[] = []
    let url: string | null = `${GRAPH_API}/me/calendars?$top=200`

    while (url) {
      const page: GraphCalendarPage = await providerJson<GraphCalendarPage>(
        url,
        {
          headers: await this.#headers(),
        }
      )
      for (const item of page.value ?? []) {
        if (!item.id) continue
        calendars.push({
          remoteId: item.id,
          name: item.name ?? item.id,
          description: null,
          timeZone: null,
          color: item.color ?? null,
          readOnly: item.canEdit === false,
        })
      }
      url = page['@odata.nextLink'] ? graphLink(page['@odata.nextLink']) : null
    }

    return calendars
  }

  async pull(input: WorkPullInput): Promise<WorkPullResult> {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = input.windowStart ?? now - 365 * 24 * 60 * 60
    const windowEnd = input.windowEnd ?? now + 3 * 365 * 24 * 60 * 60
    let url = input.cursor
      ? graphLink(input.cursor)
      : `${GRAPH_API}/me/calendars/${encodeURIComponent(input.remoteCalendarId)}/calendarView/delta?${new URLSearchParams(
          {
            startDateTime: new Date(windowStart * 1000).toISOString(),
            endDateTime: new Date(windowEnd * 1000).toISOString(),
          }
        )}`
    const changes: WorkPullResult['changes'] = []
    let deltaLink: string | null = null

    while (url) {
      const page = await providerJson<GraphDeltaPage>(url, {
        headers: await this.#headers(),
      })
      for (const raw of page.value ?? []) {
        const event = normalizeGraphEvent(raw)
        changes.push({
          resourceType: 'EVENT',
          remoteId: event.remoteId,
          etag: event.etag,
          iCalUid: event.iCalUid,
          deleted: event.deleted,
          payload: event,
        })
      }

      if (page['@odata.nextLink']) {
        url = graphLink(page['@odata.nextLink'])
        continue
      }
      deltaLink = page['@odata.deltaLink']
        ? graphLink(page['@odata.deltaLink'])
        : null
      url = ''
    }

    if (!deltaLink)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Microsoft Graph did not return a delta link.'
      )

    return {
      changes,
      cursor: deltaLink,
      windowStart,
      windowEnd,
    }
  }

  async push(resource: {
    type: 'TASK' | 'TASK_LIST' | 'CALENDAR' | 'EVENT'
    remoteCalendarId: string
    localId: string
    remoteId?: string | null
    etag?: string | null
    payload: unknown
  }) {
    if (resource.type !== 'EVENT')
      throw new WorkSyncProviderError(
        'resource-unsupported',
        'Microsoft provider synchronization currently supports events only.'
      )

    const event = remoteEventSchema.parse(resource.payload)
    const existing = resource.remoteId
    const url = existing
      ? `${GRAPH_API}/me/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events/${encodeURIComponent(existing)}`
      : `${GRAPH_API}/me/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events`
    const response = await providerFetch(url, {
      method: existing ? 'PATCH' : 'POST',
      headers: await this.#headers({
        'content-type': 'application/json',
        ...(resource.etag ? { 'if-match': resource.etag } : {}),
      }),
      body: JSON.stringify(graphEventBody(event)),
    })

    let saved: GraphEvent
    try {
      saved = (await response.json()) as GraphEvent
    } catch {
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Microsoft Graph returned invalid event JSON.'
      )
    }
    const normalized = normalizeGraphEvent(saved)
    return {
      remoteId: normalized.remoteId,
      etag: normalized.etag,
      iCalUid: normalized.iCalUid,
    }
  }

  async remove(resource: {
    type: 'TASK' | 'TASK_LIST' | 'CALENDAR' | 'EVENT'
    remoteCalendarId: string
    remoteId: string
    etag?: string | null
  }) {
    if (resource.type !== 'EVENT')
      throw new WorkSyncProviderError(
        'resource-unsupported',
        'Microsoft provider synchronization currently supports events only.'
      )

    await providerFetch(
      `${GRAPH_API}/me/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events/${encodeURIComponent(resource.remoteId)}`,
      {
        method: 'DELETE',
        headers: await this.#headers(
          resource.etag ? { 'if-match': resource.etag } : {}
        ),
      }
    )
  }
}
