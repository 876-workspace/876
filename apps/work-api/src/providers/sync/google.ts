import { remoteEventSchema } from './remote-event.js'
import {
  WorkSyncProviderError,
  type WorkPullInput,
  type WorkPullResult,
  type WorkRemoteCalendar,
  type WorkRemoteEvent,
  type WorkSyncCredential,
  type WorkSyncProviderAdapter,
} from './provider.js'
import { providerFetch, providerJson } from './http.js'

const GOOGLE_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

type GoogleCalendarList = {
  items?: Array<{
    id?: string
    summary?: string
    description?: string
    timeZone?: string
    backgroundColor?: string
    accessRole?: string
  }>
  nextPageToken?: string
}

type GoogleEvent = {
  id?: string
  status?: string
  etag?: string
  iCalUID?: string
  summary?: string
  description?: string
  location?: string
  transparency?: string
  updated?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
}

type GoogleEventList = {
  items?: GoogleEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  token_type?: string
}

function config() {
  const clientId = process.env.WORK_GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.WORK_GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret)
    throw new WorkSyncProviderError(
      'provider-not-configured',
      'Google Calendar synchronization is not configured.'
    )
  return { clientId, clientSecret }
}

function epoch(value: string | undefined) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null
}

function normalizeGoogleEvent(value: GoogleEvent): WorkRemoteEvent {
  const remoteId = value.id?.trim()
  if (!remoteId)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'Google Calendar returned an event without an id.'
    )

  const deleted = value.status === 'cancelled'
  const allDay = Boolean(value.start?.date)
  const event: WorkRemoteEvent = {
    remoteId,
    etag: value.etag ?? null,
    iCalUid: value.iCalUID ?? null,
    title: value.summary ?? '(Untitled)',
    description: value.description ?? null,
    location: value.location ?? null,
    status:
      value.status === 'tentative'
        ? 'TENTATIVE'
        : value.status === 'cancelled'
          ? 'CANCELLED'
          : 'CONFIRMED',
    busyStatus: value.transparency === 'transparent' ? 'FREE' : 'BUSY',
    allDay,
    updatedAt: epoch(value.updated),
    deleted,
  }

  if (deleted) return event

  if (allDay) {
    event.startDate = value.start?.date ?? null
    event.endDate = value.end?.date ?? null
  } else {
    event.startAt = epoch(value.start?.dateTime)
    event.endAt = epoch(value.end?.dateTime)
    event.timeZone = value.start?.timeZone ?? value.end?.timeZone ?? 'UTC'
  }

  return remoteEventSchema.parse(event)
}

function googleEventBody(event: WorkRemoteEvent) {
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    status:
      event.status === 'CANCELLED'
        ? 'cancelled'
        : event.status === 'TENTATIVE'
          ? 'tentative'
          : 'confirmed',
    transparency: event.busyStatus === 'FREE' ? 'transparent' : 'opaque',
  }

  if (event.allDay) {
    body.start = { date: event.startDate }
    body.end = { date: event.endDate }
  } else {
    body.start = {
      dateTime: new Date((event.startAt ?? 0) * 1000).toISOString(),
      timeZone: event.timeZone ?? 'UTC',
    }
    body.end = {
      dateTime: new Date((event.endAt ?? 0) * 1000).toISOString(),
      timeZone: event.timeZone ?? 'UTC',
    }
  }

  return body
}

export class GoogleCalendarAdapter implements WorkSyncProviderAdapter {
  readonly provider = 'GOOGLE' as const
  readonly #credential: WorkSyncCredential
  #token: { value: string; expiresAt: number } | null = null

  constructor(credential: WorkSyncCredential) {
    this.#credential = credential
  }

  async #accessToken() {
    const now = Math.floor(Date.now() / 1000)
    if (this.#token && this.#token.expiresAt > now + 60) return this.#token.value
    if (
      this.#credential.accessToken &&
      (!this.#credential.expiresAt || this.#credential.expiresAt > now + 60)
    )
      return this.#credential.accessToken

    const refreshToken = this.#credential.refreshToken
    if (!refreshToken)
      throw new WorkSyncProviderError(
        'credential-unavailable',
        'Google Calendar refresh credentials are unavailable.'
      )

    const { clientId, clientSecret } = config()
    let response: Response
    try {
      response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })
    } catch (error) {
      throw new WorkSyncProviderError(
        'provider-unavailable',
        'Google OAuth could not be reached.'
      )
    }

    if (!response.ok)
      throw new WorkSyncProviderError(
        response.status === 400 || response.status === 401
          ? 'provider-unauthorized'
          : 'provider-unavailable',
        'Google Calendar authorization could not be refreshed.'
      )

    let token: GoogleTokenResponse
    try {
      token = (await response.json()) as GoogleTokenResponse
    } catch (error) {
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google OAuth returned invalid JSON.'
      )
    }

    if (!token.access_token)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google OAuth did not return an access token.'
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
      ...extra,
    }
  }

  async calendars(): Promise<WorkRemoteCalendar[]> {
    const calendars: WorkRemoteCalendar[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({ maxResults: '250' })
      if (pageToken) params.set('pageToken', pageToken)
      const page = await providerJson<GoogleCalendarList>(
        `${GOOGLE_API}/users/me/calendarList?${params}`,
        { headers: await this.#headers() }
      )

      for (const item of page.items ?? []) {
        if (!item.id) continue
        calendars.push({
          remoteId: item.id,
          name: item.summary ?? item.id,
          description: item.description ?? null,
          timeZone: item.timeZone ?? null,
          color: item.backgroundColor ?? null,
          readOnly:
            item.accessRole === 'reader' || item.accessRole === 'freeBusyReader',
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken)

    return calendars
  }

  async pull(input: WorkPullInput): Promise<WorkPullResult> {
    const changes: WorkPullResult['changes'] = []
    let pageToken: string | undefined
    let nextSyncToken: string | undefined

    do {
      const params = new URLSearchParams({
        maxResults: '2500',
        showDeleted: 'true',
        singleEvents: 'true',
      })
      if (input.cursor) params.set('syncToken', input.cursor)
      if (pageToken) params.set('pageToken', pageToken)

      const page = await providerJson<GoogleEventList>(
        `${GOOGLE_API}/calendars/${encodeURIComponent(input.remoteCalendarId)}/events?${params}`,
        { headers: await this.#headers() }
      )

      for (const raw of page.items ?? []) {
        const event = normalizeGoogleEvent(raw)
        changes.push({
          resourceType: 'EVENT',
          remoteId: event.remoteId,
          etag: event.etag,
          iCalUid: event.iCalUid,
          deleted: event.deleted,
          payload: event,
        })
      }

      pageToken = page.nextPageToken
      nextSyncToken = page.nextSyncToken ?? nextSyncToken
    } while (pageToken)

    if (!nextSyncToken)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google Calendar did not return a synchronization token.'
      )

    return { changes, cursor: nextSyncToken }
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
        'Google provider synchronization currently supports events only.'
      )

    const event = remoteEventSchema.parse(resource.payload)
    const existing = resource.remoteId
    const url = existing
      ? `${GOOGLE_API}/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events/${encodeURIComponent(existing)}`
      : `${GOOGLE_API}/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events`
    const response = await providerFetch(url, {
      method: existing ? 'PUT' : 'POST',
      headers: await this.#headers({
        'content-type': 'application/json',
        ...(resource.etag ? { 'if-match': resource.etag } : {}),
      }),
      body: JSON.stringify(googleEventBody(event)),
    })

    let saved: GoogleEvent
    try {
      saved = (await response.json()) as GoogleEvent
    } catch (error) {
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'Google Calendar returned invalid event JSON.'
      )
    }
    const normalized = normalizeGoogleEvent(saved)
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
        'Google provider synchronization currently supports events only.'
      )

    await providerFetch(
      `${GOOGLE_API}/calendars/${encodeURIComponent(resource.remoteCalendarId)}/events/${encodeURIComponent(resource.remoteId)}`,
      {
        method: 'DELETE',
        headers: await this.#headers(
          resource.etag ? { 'if-match': resource.etag } : {}
        ),
      }
    )
  }
}
