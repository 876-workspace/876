import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import { EMPTY_WORK_WIDGET_CAPABILITIES } from '../work-capabilities'
import { WorkWidgetManageView } from './work-widget-manage'

const CAPABILITIES = {
  ...EMPTY_WORK_WIDGET_CAPABILITIES,
  canCreateCalendars: true,
  canEditCalendars: true,
}

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

function emptyList(url: string) {
  return {
    object: 'list' as const,
    data: [],
    has_more: false,
    total_count: 0,
    url,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorkWidgetManageView calendar sync', () => {
  it('keeps ordinary Work management available when provider management fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/task-lists') return success(emptyList(url))
      if (url === '/api/calendars') return success(emptyList(url))
      if (url === '/api/calendar-sync/connections')
        return Response.json(
          {
            data: null,
            error: {
              code: 'work/provider-unavailable',
              message: 'Calendar connections are unavailable.',
            },
          },
          { status: 503 }
        )
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WorkWidgetManageView capabilities={CAPABILITIES} />)

    await expect.element(page.getByText('Task lists')).toBeVisible()
    await expect.element(page.getByText('Calendars')).toBeVisible()
    await expect
      .element(page.getByText('Calendar connections are unavailable.'))
      .toBeVisible()
    await expect.element(page.getByText('Connected calendars')).toBeVisible()
  })

  it('renders provider read-only calendar links as pull-only subscriptions', async () => {
    const connection = {
      object: 'sync_connection_summary' as const,
      id: 'conn_1',
      provider: 'GOOGLE' as const,
      status: 'ACTIVE' as const,
      authorized: true,
      remoteAccountLabel: 'calendar@example.com',
      caldavUrl: null,
      lastSyncedAt: null,
      lastErrorCode: null,
      createdAt: 100,
      updatedAt: 100,
    }
    const remoteCalendar = {
      object: 'remote_calendar' as const,
      remoteId: 'remote_1',
      provider: 'GOOGLE' as const,
      name: 'Shared calendar',
      description: null,
      timeZone: 'America/Jamaica',
      color: null,
      readOnly: true,
    }
    const link = {
      object: 'sync_calendar_link' as const,
      id: 'mapping_1',
      connectionId: connection.id,
      provider: 'GOOGLE' as const,
      calendarId: 'calendar_1',
      remoteCalendarId: remoteCalendar.remoteId,
      remoteCalendarName: remoteCalendar.name,
      syncDirection: 'PULL_ONLY' as const,
      syncWindowStart: null,
      syncWindowEnd: null,
      lastSyncedAt: null,
      lastErrorCode: null,
      createdAt: 100,
      updatedAt: 100,
    }

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/task-lists') return success(emptyList(url))
      if (url === '/api/calendars') return success(emptyList(url))
      if (url === '/api/calendar-sync/connections')
        return success({
          ...emptyList(url),
          data: [connection],
          total_count: 1,
        })
      if (url.endsWith('/remote-calendars'))
        return success({
          ...emptyList(url),
          data: [remoteCalendar],
          total_count: 1,
        })
      if (url.endsWith('/calendar-links'))
        return success({
          ...emptyList(url),
          data: [link],
          total_count: 1,
        })
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WorkWidgetManageView capabilities={CAPABILITIES} />)

    await expect
      .element(page.getByRole('combobox', { name: 'External calendar connection' }))
      .toBeVisible()
    await page
      .getByRole('combobox', { name: 'External calendar connection' })
      .selectOptions(connection.id)

    await expect.element(page.getByText('Shared calendar')).toBeVisible()
    await expect.element(page.getByText('Linked · read only')).toBeVisible()
  })
})
