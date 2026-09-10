import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserWorkCalendarSync } from './browser-calendar-sync'

const CONNECTION_PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/api/calendar-sync/connections',
}
const CONNECTION = {
  object: 'sync_connection_summary' as const,
  id: 'conn/1',
  provider: 'CALDAV' as const,
  status: 'ACTIVE' as const,
  authorized: true,
  remoteAccountLabel: null,
  caldavUrl: 'https://calendar.example.com/dav',
  lastSyncedAt: null,
  lastErrorCode: null,
  createdAt: 100,
  updatedAt: 100,
}
const AUTHORIZATION = {
  object: 'sync_authorization' as const,
  connectionId: 'conn/1',
  provider: 'GOOGLE' as const,
  authorizeUrl: 'https://accounts.example.com/oauth',
  expiresAt: 200,
}
const REMOTE_CALENDAR_PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false as const,
  total_count: 0,
  url: '/api/calendar-sync/connections/conn%2F1/remote-calendars',
}
const LINK = {
  object: 'sync_calendar_link' as const,
  id: 'mapping/1',
  connectionId: 'conn/1',
  provider: 'GOOGLE' as const,
  calendarId: 'calendar/1',
  remoteCalendarId: 'remote/1',
  remoteCalendarName: 'Operations',
  syncDirection: 'BIDIRECTIONAL' as const,
  syncWindowStart: null,
  syncWindowEnd: null,
  lastSyncedAt: null,
  lastErrorCode: null,
  createdAt: 100,
  updatedAt: 100,
}
const RUN = {
  object: 'sync_run' as const,
  connectionId: 'conn/1',
  calendarLinkId: null,
  calendars: 1,
  pulled: 0,
  created: 0,
  updated: 0,
  deleted: 0,
  pushed: 0,
  completedAt: 200,
}

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

function expectJsonHeaders(value: unknown) {
  expect(value).toBeInstanceOf(Headers)
  if (!(value instanceof Headers)) throw new Error('Expected Headers instance.')
  expect(value.get('content-type')).toBe('application/json')
}

describe('browserWorkCalendarSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists browser-safe connection summaries through the host route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(CONNECTION_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWorkCalendarSync.connections.list()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/calendar-sync/connections')
    expect(result).toEqual({ data: CONNECTION_PAGE, error: null })
  })

  it('posts only provider setup input without acting-user authority', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(CONNECTION))
    vi.stubGlobal('fetch', fetchMock)
    const input = {
      provider: 'CALDAV' as const,
      caldavUrl: 'https://calendar.example.com/dav',
      username: 'calendar-user',
      password: 'app-password',
    }

    await browserWorkCalendarSync.connections.setup(input)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/calendar-sync/connections')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(input),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty(
      'userId'
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty(
      'credentialRef'
    )
  })

  it('requests OAuth authorization through an encoded connection route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(AUTHORIZATION))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWorkCalendarSync.connections.authorize('conn/1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/authorize'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(result).toEqual({ data: AUTHORIZATION, error: null })
  })

  it('loads remote calendars through the selected connection route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(REMOTE_CALENDAR_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    await browserWorkCalendarSync.connections.remoteCalendars('conn/1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/remote-calendars'
    )
  })

  it('links a remote calendar without accepting local user or credential fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(LINK))
    vi.stubGlobal('fetch', fetchMock)
    const input = { remoteCalendarId: 'remote/1' }

    await browserWorkCalendarSync.connections.calendarLinks.create('conn/1', input)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/calendar-links'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(input),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
  })

  it('unlinks an encoded remote calendar mapping through the host route', async () => {
    const deleted = { object: 'sync_mapping' as const, id: 'mapping/1', deleted: true }
    const fetchMock = vi.fn().mockResolvedValue(success(deleted))
    vi.stubGlobal('fetch', fetchMock)

    await browserWorkCalendarSync.connections.calendarLinks.delete(
      'conn/1',
      'mapping/1'
    )

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/calendar-links/mapping%2F1'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })

  it('runs connection synchronization through a POST command', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(RUN))
    vi.stubGlobal('fetch', fetchMock)

    await browserWorkCalendarSync.connections.sync('conn/1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/sync'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
  })

  it('runs one calendar-link synchronization through a POST command', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(success({ ...RUN, calendarLinkId: 'mapping/1' }))
    vi.stubGlobal('fetch', fetchMock)

    await browserWorkCalendarSync.connections.calendarLinks.sync(
      'conn/1',
      'mapping/1'
    )

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/calendar-sync/connections/conn%2F1/calendar-links/mapping%2F1/sync'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
  })
})
