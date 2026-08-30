import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAlertsResource } from './alerts'
import type { WorkRuntime } from '../runtime'

describe('createAlertsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const alerts = createAlertsResource(runtime)

  function createAlertFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'alert',
      id: 'alert_kin_01',
      organizationId: 'org_kingston_central',
      taskId: 'task_kin_01',
      eventId: null,
      userId: 'usr_tariq_01',
      triggerType: 'RELATIVE',
      triggerAt: null,
      offsetSeconds: -900,
      action: 'NOTIFICATION',
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

  it('lists alerts with organization path and credential header', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createAlertFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/alerts',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await alerts.list('org_kingston_central')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('list')
  })

  it('threads query filter parameters when listing alerts', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/alerts',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await alerts.list('org_kingston_central', {
      taskId: 'task_kin_01',
      userId: 'usr_tariq_01',
      status: 'SCHEDULED',
      limit: 10,
      startingAfter: 'alert_anchor',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts?task_id=task_kin_01&user_id=usr_tariq_01&status=SCHEDULED&limit=10&starting_after=alert_anchor',
      expect.any(Object)
    )
  })

  it('retrieves single alert by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createAlertFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await alerts.retrieve('org_kingston_central', 'alert_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts/alert_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('alert_kin_01')
    expect(result.error).toBeNull()
  })

  it('creates an alert with serialized JSON body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createAlertFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      taskId: 'task_kin_01',
      userId: 'usr_tariq_01',
      triggerType: 'RELATIVE' as const,
      offsetSeconds: -900,
      createdBy: 'usr_tariq_01',
    }

    const result = await alerts.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('alert_kin_01')
  })

  it('updates an alert via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createAlertFixture({ status: 'DISMISSED' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await alerts.update('org_kingston_central', 'alert_kin_01', {
      status: 'DISMISSED',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts/alert_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'DISMISSED' }),
      })
    )
    expect(result.data?.status).toBe('DISMISSED')
  })

  it('deletes an alert via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'alert', id: 'alert_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await alerts.delete('org_kingston_central', 'alert_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/alerts/alert_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'alert', id: 'alert_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates API error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/alert-not-found', message: 'Alert not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await alerts.retrieve('org_kingston_central', 'alert_missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'work/alert-not-found', message: 'Alert not found.' },
    })
  })
})
