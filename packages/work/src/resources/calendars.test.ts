import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCalendarsResource } from './calendars'
import type { WorkRuntime } from '../runtime'

describe('createCalendarsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const calendars = createCalendarsResource(runtime)

  function createCalendarFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'calendar',
      id: 'calendar_kin_01',
      uid: 'calendar_kin_01@work.876',
      organizationId: 'org_kingston_central',
      ownerUserId: 'usr_tariq_01',
      name: 'Dispatch Calendar',
      description: null,
      timeZone: 'America/Jamaica',
      visibility: 'PRIVATE',
      isPrimary: true,
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists calendars with query filters and internal-key auth', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createCalendarFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/calendars',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await calendars.list('org_kingston_central', {
      userId: 'usr_tariq_01',
      visibility: 'PRIVATE',
      limit: 25,
      startingAfter: 'cal_anchor',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars?user_id=usr_tariq_01&visibility=PRIVATE&limit=25&starting_after=cal_anchor',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'work-internal-key',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('retrieves calendar by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createCalendarFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await calendars.retrieve('org_kingston_central', 'calendar_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('calendar_kin_01')
  })

  it('creates calendar with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createCalendarFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      name: 'Dispatch Calendar',
      timeZone: 'America/Jamaica',
      createdBy: 'usr_tariq_01',
    }
    const result = await calendars.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.name).toBe('Dispatch Calendar')
  })

  it('ensures primary calendar via POST /primary', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createCalendarFixture({ isPrimary: true }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = { userId: 'usr_tariq_01', timeZone: 'America/Jamaica' }
    const result = await calendars.ensurePrimary('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/primary',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.isPrimary).toBe(true)
  })

  it('updates calendar via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createCalendarFixture({ name: 'Renamed Dispatch' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await calendars.update('org_kingston_central', 'calendar_kin_01', {
      name: 'Renamed Dispatch',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed Dispatch' }),
      })
    )
    expect(result.data?.name).toBe('Renamed Dispatch')
  })

  it('deletes calendar via DELETE with deletedBy payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'calendar', id: 'calendar_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await calendars.delete('org_kingston_central', 'calendar_kin_01', 'usr_tariq_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/calendars/calendar_kin_01',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deletedBy: 'usr_tariq_01' }),
      })
    )
    expect(result).toEqual({
      data: { object: 'calendar', id: 'calendar_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/tenant-not-found', message: 'Tenant not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await calendars.list('org_missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'work/tenant-not-found', message: 'Tenant not found.' },
    })
  })
})
