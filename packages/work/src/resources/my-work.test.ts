import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMyWorkResource } from './my-work'
import type { WorkRuntime } from '../runtime'

describe('createMyWorkResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const myWork = createMyWorkResource(runtime)

  function createMyWorkFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'my_work',
      organizationId: 'org_kingston_central',
      userId: 'usr_tariq_01',
      from: 1_788_200_000,
      to: 1_788_300_000,
      tasks: [],
      reminders: [],
      events: [],
      overdueTasks: [],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retrieves my-work with from and to query parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createMyWorkFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await myWork.retrieve('org_kingston_central', {
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/my-work?from=1788200000&to=1788300000',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.data?.object).toBe('my_work')
    expect(result.error).toBeNull()
  })

  it('includes userId query parameter when supplied in filter', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createMyWorkFixture({ userId: 'usr_tariq_01' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await myWork.retrieve('org_kingston_central', {
      userId: 'usr_tariq_01',
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/my-work?from=1788200000&to=1788300000&user_id=usr_tariq_01',
      expect.any(Object)
    )
    expect(result.data?.userId).toBe('usr_tariq_01')
  })

  it('correctly handles response populated with tasks, reminders, events, and overdueTasks', async () => {
    const fullFixture = createMyWorkFixture({
      tasks: [
        {
          object: 'task',
          id: 'task_01',
          uid: 'task_01@work.876',
          organizationId: 'org_kingston_central',
          listId: 'tasklist_01',
          parentTaskId: null,
          context: null,
          links: [],
          title: 'Kingston Depot Checklist',
          description: null,
          status: 'OPEN',
          importance: 'NORMAL',
          priorityId: null,
          assigneeId: null,
          assignments: [],
          startAt: null,
          startTimeZone: null,
          dueAt: 1_788_250_000,
          dueTimeZone: 'UTC',
          estimatedDuration: null,
          percentComplete: 0,
          recurrenceRuleId: null,
          completedAt: null,
          completedBy: null,
          isOverdue: false,
          sortOrder: 0,
          createdBy: 'usr_tariq_01',
          createdAt: 1_788_080_400,
          updatedAt: 1_788_080_400,
        },
      ],
      reminders: [
        {
          object: 'reminder',
          id: 'rem_01',
          organizationId: 'org_kingston_central',
          context: null,
          title: 'Call Supervisor',
          note: null,
          remindAt: 1_788_260_000,
          offsetMinutesBeforeDue: null,
          channel: 'in-app',
          timeZone: 'UTC',
          recurrenceRuleId: null,
          userId: 'usr_tariq_01',
          status: 'SCHEDULED',
          sentAt: null,
          dismissedAt: null,
          createdBy: 'usr_tariq_01',
          createdAt: 1_788_080_400,
          updatedAt: 1_788_080_400,
        },
      ],
      events: [
        {
          object: 'event',
          id: 'ev_01',
          uid: 'ev_01@work.876',
          organizationId: 'org_kingston_central',
          calendarId: 'cal_01',
          context: null,
          title: 'Daily Logistics Briefing',
          description: null,
          location: null,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          allDay: false,
          startAt: 1_788_270_000,
          endAt: 1_788_273_600,
          timeZone: 'UTC',
          startDate: null,
          endDate: null,
          recurrenceRuleId: null,
          recurrenceId: null,
          participants: [],
          createdBy: 'usr_tariq_01',
          createdAt: 1_788_080_400,
          updatedAt: 1_788_080_400,
        },
      ],
      overdueTasks: [],
    })
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: fullFixture,
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await myWork.retrieve('org_kingston_central', {
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(result.data?.tasks).toHaveLength(1)
    expect(result.data?.reminders).toHaveLength(1)
    expect(result.data?.events).toHaveLength(1)
  })

  it('encodes organizationId in URL', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createMyWorkFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await myWork.retrieve('org/caribbean:hub', {
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2Fcaribbean%3Ahub/my-work?from=1788200000&to=1788300000',
      expect.any(Object)
    )
  })

  it('propagates invalid-response error on malformed payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { invalid: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await myWork.retrieve('org_kingston_central', {
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/invalid-response',
        message: 'Work API returned an invalid response.',
      },
    })
  })

  it('propagates API error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/tenant-inactive',
            message: 'Workspace inactive',
          },
        }),
        { status: 409, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await myWork.retrieve('org_kingston_central', {
      from: 1_788_200_000,
      to: 1_788_300_000,
    })

    expect(result).toEqual({
      data: null,
      error: { code: 'work/tenant-inactive', message: 'Workspace inactive' },
    })
  })
})
