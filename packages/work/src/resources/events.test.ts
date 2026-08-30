import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEventsResource } from './events'
import type { WorkRuntime } from '../runtime'

describe('createEventsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const events = createEventsResource(runtime)

  function createEventFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'event',
      id: 'event_kin_01',
      uid: 'event_kin_01@work.876',
      organizationId: 'org_kingston_central',
      calendarId: 'calendar_kin_01',
      context: { service: 'crm', resource: 'request', id: 'req_1' },
      title: 'Customer Site Visit',
      description: null,
      location: 'Kingston Port',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      allDay: false,
      startAt: 1_788_271_200,
      endAt: 1_788_274_800,
      timeZone: 'America/Jamaica',
      startDate: null,
      endDate: null,
      recurrenceRuleId: null,
      recurrenceId: null,
      participants: [],
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists events with query filters and CRM context parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createEventFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/events',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await events.list('org_kingston_central', {
      calendarId: 'calendar_kin_01',
      context: { service: 'crm', resource: 'request', id: 'req_1' },
      from: 1_788_200_000,
      to: 1_788_300_000,
      status: 'CONFIRMED',
      limit: 20,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events?calendar_id=calendar_kin_01&context_service=crm&context_resource=request&context_id=req_1&from=1788200000&to=1788300000&status=CONFIRMED&limit=20',
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

  it('retrieves single event by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createEventFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await events.retrieve('org_kingston_central', 'event_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('event_kin_01')
    expect(result.error).toBeNull()
  })

  it('creates timed event with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createEventFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      calendarId: 'calendar_kin_01',
      title: 'Customer Site Visit',
      allDay: false as const,
      startAt: 1_788_271_200,
      endAt: 1_788_274_800,
      timeZone: 'America/Jamaica',
      createdBy: 'usr_tariq_01',
    }
    const result = await events.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.title).toBe('Customer Site Visit')
  })

  it('creates all-day event with POST payload', async () => {
    const allDayFixture = createEventFixture({
      allDay: true,
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      startAt: null,
      endAt: null,
      timeZone: null,
    })
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: allDayFixture,
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      calendarId: 'calendar_kin_01',
      title: 'Holiday',
      allDay: true as const,
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      createdBy: 'usr_tariq_01',
    }
    const result = await events.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.allDay).toBe(true)
  })

  it('updates event via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createEventFixture({ title: 'Updated Site Visit' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await events.update('org_kingston_central', 'event_kin_01', {
      title: 'Updated Site Visit',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Site Visit' }),
      })
    )
    expect(result.data?.title).toBe('Updated Site Visit')
  })

  it('deletes event via DELETE with deletedBy payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'event', id: 'event_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await events.delete(
      'org_kingston_central',
      'event_kin_01',
      'usr_tariq_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/events/event_kin_01',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deletedBy: 'usr_tariq_01' }),
      })
    )
    expect(result).toEqual({
      data: { object: 'event', id: 'event_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/event-not-found', message: 'Event not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await events.retrieve(
      'org_kingston_central',
      'event_missing'
    )

    expect(result).toEqual({
      data: null,
      error: { code: 'work/event-not-found', message: 'Event not found.' },
    })
  })
})
