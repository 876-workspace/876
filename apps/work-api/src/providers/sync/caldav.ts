import {
  escapeXml,
  hasXmlTag,
  parseCalendarEvent,
  serializeCalendarEvent,
  xmlBlocks,
  xmlText,
} from './caldav-codec.js'
import { requireHttpsProviderUrl, retryAfterSeconds } from './http.js'
import {
  WorkSyncProviderError,
  type WorkPullInput,
  type WorkPullResult,
  type WorkRemoteCalendar,
  type WorkSyncCredential,
  type WorkSyncProviderAdapter,
} from './provider.js'
import { remoteEventSchema } from './remote-event.js'

const DAV_HEADERS = {
  'content-type': 'application/xml; charset=utf-8',
  accept: 'application/xml, text/xml',
}

function compactUtc(value: number) {
  return new Date(value * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export class CaldavCalendarAdapter implements WorkSyncProviderAdapter {
  readonly provider = 'CALDAV' as const
  readonly #credential: WorkSyncCredential
  readonly #base: URL

  constructor(credential: WorkSyncCredential, caldavUrl: string | null | undefined) {
    if (!caldavUrl)
      throw new WorkSyncProviderError(
        'provider-not-configured',
        'A CalDAV server URL is required.'
      )
    this.#base = requireHttpsProviderUrl(caldavUrl)
    this.#credential = credential
  }

  #authorization() {
    if (!this.#credential.username || !this.#credential.password)
      throw new WorkSyncProviderError(
        'credential-unavailable',
        'CalDAV credentials are unavailable.'
      )
    return `Basic ${Buffer.from(`${this.#credential.username}:${this.#credential.password}`).toString('base64')}`
  }

  #url(value: string) {
    const resolved = new URL(value, this.#base)
    return requireHttpsProviderUrl(resolved.toString(), this.#base.origin)
  }

  async #request(
    url: URL,
    init: RequestInit,
    options: { cursor?: boolean; allowNotFound?: boolean } = {}
  ) {
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          authorization: this.#authorization(),
          ...init.headers,
        },
      })
    } catch (error) {
      throw new WorkSyncProviderError(
        'provider-unavailable',
        'The CalDAV server could not be reached.'
      )
    }

    if (response.ok || (options.allowNotFound && response.status === 404))
      return response

    if (options.cursor && (response.status === 403 || response.status === 409))
      throw new WorkSyncProviderError(
        'provider-cursor-invalid',
        'The CalDAV synchronization token is no longer valid.'
      )

    if (response.status === 401 || response.status === 403)
      throw new WorkSyncProviderError(
        'provider-unauthorized',
        'The CalDAV authorization is no longer valid.'
      )

    if (response.status === 429)
      throw new WorkSyncProviderError(
        'provider-rate-limited',
        'The CalDAV server temporarily rate limited synchronization.',
        retryAfterSeconds(response)
      )

    if (response.status >= 500)
      throw new WorkSyncProviderError(
        'provider-unavailable',
        'The CalDAV server is temporarily unavailable.'
      )

    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The CalDAV server rejected the synchronization request.'
    )
  }

  async #xml(url: URL, init: RequestInit, cursor = false) {
    const response = await this.#request(url, init, { cursor })
    try {
      return await response.text()
    } catch (error) {
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'The CalDAV server returned an unreadable response.'
      )
    }
  }

  async #home() {
    const discovery = await this.#xml(this.#base, {
      method: 'PROPFIND',
      headers: { ...DAV_HEADERS, Depth: '0' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:current-user-principal/><c:calendar-home-set/></d:prop>
</d:propfind>`,
    })

    const directHome = xmlBlocks(discovery, 'calendar-home-set')
      .map((block) => xmlText(block, 'href'))
      .find(Boolean)
    if (directHome) return this.#url(directHome)

    const principal = xmlBlocks(discovery, 'current-user-principal')
      .map((block) => xmlText(block, 'href'))
      .find(Boolean)
    if (!principal) return this.#base

    const principalXml = await this.#xml(this.#url(principal), {
      method: 'PROPFIND',
      headers: { ...DAV_HEADERS, Depth: '0' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`,
    })
    const home = xmlBlocks(principalXml, 'calendar-home-set')
      .map((block) => xmlText(block, 'href'))
      .find(Boolean)
    return home ? this.#url(home) : this.#base
  }

  async calendars(): Promise<WorkRemoteCalendar[]> {
    const home = await this.#home()
    const xml = await this.#xml(home, {
      method: 'PROPFIND',
      headers: { ...DAV_HEADERS, Depth: '1' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/">
  <d:prop><d:resourcetype/><d:displayname/><d:sync-token/><a:calendar-color/></d:prop>
</d:propfind>`,
    })

    const result: WorkRemoteCalendar[] = []
    for (const response of xmlBlocks(xml, 'response')) {
      const type = xmlBlocks(response, 'resourcetype')[0] ?? ''
      if (!hasXmlTag(type, 'calendar')) continue
      const href = xmlText(response, 'href')
      if (!href) continue
      const url = this.#url(href)
      result.push({
        remoteId: url.toString(),
        name: xmlText(response, 'displayname') || url.pathname,
        description: null,
        timeZone: null,
        color: xmlText(response, 'calendar-color'),
        readOnly: false,
      })
    }
    return result
  }

  async #syncToken(calendar: URL) {
    const xml = await this.#xml(calendar, {
      method: 'PROPFIND',
      headers: { ...DAV_HEADERS, Depth: '0' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:sync-token/></d:prop></d:propfind>`,
    })
    return xmlText(xml, 'sync-token')
  }

  async pull(input: WorkPullInput): Promise<WorkPullResult> {
    const calendar = this.#url(input.remoteCalendarId)
    const body = input.cursor
      ? `<?xml version="1.0" encoding="utf-8"?>
<d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:sync-token>${escapeXml(input.cursor)}</d:sync-token>
  <d:sync-level>1</d:sync-level>
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
</d:sync-collection>`
      : `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT"${
        input.windowStart && input.windowEnd
          ? `><c:time-range start="${compactUtc(input.windowStart)}" end="${compactUtc(input.windowEnd)}"/></c:comp-filter>`
          : '/>'
      }
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`
    const xml = await this.#xml(
      calendar,
      {
        method: 'REPORT',
        headers: { ...DAV_HEADERS, Depth: '1' },
        body,
      },
      Boolean(input.cursor)
    )

    const changes: WorkPullResult['changes'] = []
    for (const response of xmlBlocks(xml, 'response')) {
      const href = xmlText(response, 'href')
      if (!href) continue
      const remoteUrl = this.#url(href)
      if (remoteUrl.pathname === calendar.pathname) continue
      const deleted = /HTTP\/\d(?:\.\d)?\s+404\b/i.test(response)
      const etag = xmlText(response, 'getetag')
      const calendarData = xmlText(response, 'calendar-data')
      if (!deleted && !calendarData)
        throw new WorkSyncProviderError(
          'provider-invalid-response',
          'The CalDAV server omitted calendar data for a changed event.'
        )
      const event = parseCalendarEvent({
        calendarData: calendarData ?? '',
        remoteId: remoteUrl.toString(),
        etag,
        deleted,
      })
      changes.push({
        resourceType: 'EVENT',
        remoteId: event.remoteId,
        etag: event.etag,
        iCalUid: event.iCalUid,
        deleted: event.deleted,
        payload: event,
      })
    }

    const cursor = xmlText(xml, 'sync-token') ?? (await this.#syncToken(calendar))
    if (input.cursor && !cursor)
      throw new WorkSyncProviderError(
        'provider-invalid-response',
        'The CalDAV server omitted the next synchronization token.'
      )

    return {
      changes,
      cursor,
      windowStart: input.windowStart ?? null,
      windowEnd: input.windowEnd ?? null,
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
        'CalDAV synchronization currently supports events only.'
      )

    const event = remoteEventSchema.parse(resource.payload)
    const calendar = this.#url(resource.remoteCalendarId)
    const target = resource.remoteId
      ? this.#url(resource.remoteId)
      : this.#url(
          new URL(
            `${encodeURIComponent(resource.localId)}.ics`,
            calendar.toString().endsWith('/')
              ? calendar
              : `${calendar.toString()}/`
          ).toString()
        )
    const response = await this.#request(target, {
      method: 'PUT',
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        ...(resource.etag
          ? { 'if-match': resource.etag }
          : { 'if-none-match': '*' }),
      },
      body: serializeCalendarEvent(event),
    })

    return {
      remoteId: target.toString(),
      etag: response.headers.get('etag'),
      iCalUid: event.iCalUid ?? event.remoteId,
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
        'CalDAV synchronization currently supports events only.'
      )

    await this.#request(
      this.#url(resource.remoteId),
      {
        method: 'DELETE',
        headers: resource.etag ? { 'if-match': resource.etag } : {},
      },
      { allowNotFound: true }
    )
  }
}
