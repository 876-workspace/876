import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCalendarSubscriptionsResource } from './calendar-subscriptions'
import type { WorkRuntime } from '../runtime'

describe('createCalendarSubscriptionsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const subscriptions = createCalendarSubscriptionsResource(runtime)

  function createSubscriptionFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'calendar_subscription',
      id: 'calsub_kin_01',
      organizationId: 'org_kingston_central',
      calendarId: 'calendar_kin_01',
      userId: 'usr_tariq_01',
      role: 'VIEWER',
      color: null,
      isVisible: true,
      defaultReminderMinutes: [],
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists calendar subscriptions with proper path and headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createSubscriptionFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/calendars/calendar_kin_01/subscriptions',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await subscriptions.list(
      'org_kingston_central',
      'calendar_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01/subscriptions',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('creates calendar subscription with POST and request body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createSubscriptionFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = { userId: 'usr_tariq_01', role: 'EDITOR' as const }
    const result = await subscriptions.create(
      'org_kingston_central',
      'calendar_kin_01',
      input
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01/subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.id).toBe('calsub_kin_01')
    expect(result.error).toBeNull()
  })

  it('updates calendar subscription via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createSubscriptionFixture({ color: '#FFB800' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await subscriptions.update(
      'org_kingston_central',
      'calendar_kin_01',
      'calsub_kin_01',
      { color: '#FFB800' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01/subscriptions/calsub_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ color: '#FFB800' }),
      })
    )
    expect(result.data?.color).toBe('#FFB800')
    expect(result.error).toBeNull()
  })

  it('deletes calendar subscription via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'calendar_subscription',
            id: 'calsub_kin_01',
            deleted: true,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await subscriptions.delete(
      'org_kingston_central',
      'calendar_kin_01',
      'calsub_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01/subscriptions/calsub_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: {
        object: 'calendar_subscription',
        id: 'calsub_kin_01',
        deleted: true,
      },
      error: null,
    })
  })

  it('encodes path segments safely', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await subscriptions.list('org/special', 'cal/special')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2Fspecial/calendars/cal%2Fspecial/subscriptions',
      expect.any(Object)
    )
  })

  it('propagates error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/calendar-not-found',
            message: 'Calendar not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await subscriptions.list(
      'org_kingston_central',
      'calendar_missing'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/calendar-not-found',
        message: 'Calendar not found.',
      },
    })
  })
})
