import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createRemindersResource } from './reminders'
import type { WorkRuntime } from '../runtime'

describe('createRemindersResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const reminders = createRemindersResource(runtime)

  function createReminderFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'reminder',
      id: 'reminder_kin_01',
      organizationId: 'org_kingston_central',
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      title: 'Call Depot Dispatcher',
      note: 'Confirm truck departure',
      remindAt: 1_788_271_200,
      timeZone: 'America/Jamaica',
      recurrenceRuleId: null,
      userId: 'usr_tariq_01',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists reminders with query filters and CRM context parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createReminderFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/reminders',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.list('org_kingston_central', {
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      userId: 'usr_tariq_01',
      status: 'SCHEDULED',
      limit: 50,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders?context_service=crm&context_resource=request&context_id=req_kin_01&user_id=usr_tariq_01&status=SCHEDULED&limit=50',
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

  it('retrieves single reminder by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createReminderFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.retrieve(
      'org_kingston_central',
      'reminder_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders/reminder_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('reminder_kin_01')
  })

  it('creates reminder with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createReminderFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      title: 'Call Depot Dispatcher',
      remindAt: 1_788_271_200,
      timeZone: 'America/Jamaica',
      userId: 'usr_tariq_01',
      createdBy: 'usr_tariq_01',
    }
    const result = await reminders.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.title).toBe('Call Depot Dispatcher')
  })

  it('updates reminder status and note via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createReminderFixture({
            status: 'DISMISSED',
            note: 'Truck already dispatched',
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.update(
      'org_kingston_central',
      'reminder_kin_01',
      {
        status: 'DISMISSED',
        note: 'Truck already dispatched',
      }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders/reminder_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'DISMISSED',
          note: 'Truck already dispatched',
        }),
      })
    )
    expect(result.data?.status).toBe('DISMISSED')
  })

  it('deletes reminder via DELETE with deletedBy payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'reminder', id: 'reminder_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.delete(
      'org_kingston_central',
      'reminder_kin_01',
      'usr_tariq_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders/reminder_kin_01',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deletedBy: 'usr_tariq_01' }),
      })
    )
    expect(result).toEqual({
      data: { object: 'reminder', id: 'reminder_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/reminder-not-found',
            message: 'Reminder not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.retrieve(
      'org_kingston_central',
      'rem_missing'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/reminder-not-found',
        message: 'Reminder not found.',
      },
    })
  })

  it('lists reminders with no filter and the credential header', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/reminders',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await reminders.list('org_kingston_central')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: null,
        url: '/v1/organizations/org_kingston_central/reminders',
      },
      error: null,
    })
  })

  it('creates a reminder with a context-carrying body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createReminderFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      title: 'Call Depot Dispatcher',
      remindAt: 1_788_271_200,
      timeZone: 'America/Jamaica',
      userId: 'usr_tariq_01',
      createdBy: 'usr_tariq_01',
    }
    const result = await reminders.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/reminders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.context).toEqual({
      service: 'crm',
      resource: 'request',
      id: 'req_kin_01',
    })
  })
})
