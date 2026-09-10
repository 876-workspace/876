import { afterEach, describe, expect, it, vi } from 'vitest'

import { GoogleCalendarAdapter } from './google.js'
import { MicrosoftCalendarAdapter } from './microsoft.js'

const CREDENTIAL = {
  accessToken: 'access-token',
  expiresAt: 9_999_999_999,
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GoogleCalendarAdapter', () => {
  it('paginates calendar discovery and preserves read-only access roles', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          items: [
            { id: 'reader', summary: 'Read only', accessRole: 'reader' },
          ],
          nextPageToken: 'page-2',
        })
      )
      .mockResolvedValueOnce(
        json({
          items: [{ id: 'owner', summary: 'Writable', accessRole: 'owner' }],
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new GoogleCalendarAdapter(CREDENTIAL)

    const calendars = await adapter.calendars()

    expect(calendars).toEqual([
      expect.objectContaining({ remoteId: 'reader', readOnly: true }),
      expect.objectContaining({ remoteId: 'owner', readOnly: false }),
    ])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('pageToken=page-2')
  })

  it('returns the final sync token after paginated incremental pull', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          items: [{ id: 'gone-1', status: 'cancelled' }],
          nextPageToken: 'page-2',
        })
      )
      .mockResolvedValueOnce(
        json({
          items: [{ id: 'gone-2', status: 'cancelled' }],
          nextSyncToken: 'sync-token-2',
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new GoogleCalendarAdapter(CREDENTIAL)

    const result = await adapter.pull({
      remoteCalendarId: 'calendar/1',
      cursor: 'sync-token-1',
    })

    expect(result.cursor).toBe('sync-token-2')
    expect(result.changes.map((change) => change.remoteId)).toEqual([
      'gone-1',
      'gone-2',
    ])
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'syncToken=sync-token-1'
    )
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('pageToken=page-2')
  })

  it('normalizes HTTP 410 as an invalid provider cursor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 410 })))
    const adapter = new GoogleCalendarAdapter(CREDENTIAL)

    await expect(
      adapter.pull({ remoteCalendarId: 'calendar_1', cursor: 'stale' })
    ).rejects.toMatchObject({ code: 'provider-cursor-invalid' })
  })
})

describe('MicrosoftCalendarAdapter', () => {
  it('paginates calendar discovery with explicitly typed next links', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          value: [{ id: 'readonly', name: 'Read only', canEdit: false }],
          '@odata.nextLink':
            'https://graph.microsoft.com/v1.0/me/calendars?$skiptoken=next',
        })
      )
      .mockResolvedValueOnce(
        json({ value: [{ id: 'writable', name: 'Writable', canEdit: true }] })
      )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new MicrosoftCalendarAdapter(CREDENTIAL)

    const calendars = await adapter.calendars()

    expect(calendars).toEqual([
      expect.objectContaining({ remoteId: 'readonly', readOnly: true }),
      expect.objectContaining({ remoteId: 'writable', readOnly: false }),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects cross-origin Graph continuation links before following them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        value: [],
        '@odata.nextLink': 'https://evil.example.net/v1.0/me/calendars?page=2',
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new MicrosoftCalendarAdapter(CREDENTIAL)

    await expect(adapter.calendars()).rejects.toMatchObject({
      code: 'provider-invalid-response',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('follows delta pagination and persists only the final delta cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          value: [{ id: 'gone-1', '@removed': { reason: 'deleted' } }],
          '@odata.nextLink':
            'https://graph.microsoft.com/v1.0/me/calendars/calendar_1/calendarView/delta?$skiptoken=next',
        })
      )
      .mockResolvedValueOnce(
        json({
          value: [{ id: 'gone-2', '@removed': { reason: 'deleted' } }],
          '@odata.deltaLink':
            'https://graph.microsoft.com/v1.0/me/calendars/calendar_1/calendarView/delta?$deltatoken=final',
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new MicrosoftCalendarAdapter(CREDENTIAL)

    const result = await adapter.pull({
      remoteCalendarId: 'calendar_1',
      windowStart: 100,
      windowEnd: 200,
    })

    expect(result.cursor).toContain('$deltatoken=final')
    expect(result.windowStart).toBe(100)
    expect(result.windowEnd).toBe(200)
    expect(result.changes.map((change) => change.remoteId)).toEqual([
      'gone-1',
      'gone-2',
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
