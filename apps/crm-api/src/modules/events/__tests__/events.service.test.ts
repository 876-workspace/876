import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEventBodySchema } from '../events.schemas.js'

const mocks = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  workClient: {
    events: {
      list: vi.fn(),
      retrieve: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendars: { ensurePrimary: vi.fn() },
    eventParticipants: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      retrieve: vi.fn(),
    },
  },
  crmRequestWorkContext: vi.fn(() => ({
    service: 'crm',
    resource: 'request',
    id: 'req_mandeville_1',
  })),
}))

vi.mock('../../requests/index.js', () => ({
  requireRequestContext: mocks.requireRequestContext,
}))
vi.mock('../../../providers/work.js', () => ({
  crmRequestWorkContext: mocks.crmRequestWorkContext,
  workClient: () => mocks.workClient,
}))

import * as service from '../events.service.js'

const ORG = 'org_kingston_1'
const REQ = 'req_mandeville_1'
const tenantId = 'tenant_kingston_1'

function workEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event_spanish_town_1',
    uid: 'event_spanish_town_1@work.876',
    organizationId: ORG,
    calendarId: 'cal_1',
    context: { service: 'crm', resource: 'request', id: REQ },
    title: 'Client Review',
    description: null,
    location: 'Kingston',
    status: 'CONFIRMED' as const,
    busyStatus: 'BUSY' as const,
    allDay: false,
    startAt: Math.floor(new Date('2026-09-01T09:00:00.000Z').getTime() / 1000),
    endAt: Math.floor(new Date('2026-09-01T10:00:00.000Z').getTime() / 1000),
    timeZone: 'America/Jamaica',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_kingston_1',
    createdAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    updatedAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    ...overrides,
  }
}
function participantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part_1',
    eventId: 'event_spanish_town_1',
    kind: 'USER' as const,
    participantId: 'user_kingston_1',
    email: null,
    name: 'Asha',
    role: 'REQUIRED' as const,
    status: 'NEEDS_ACTION' as const,
    delegatedTo: null,
    delegatedFrom: null,
    respondedAt: null,
    createdAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    updatedAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRequestContext.mockResolvedValue({
    tenantId,
    requestId: REQ,
  } as never)
  mocks.crmRequestWorkContext.mockReturnValue({
    service: 'crm',
    resource: 'request',
    id: REQ,
  })
  mocks.workClient.events.list.mockResolvedValue({
    data: {
      data: [],
      has_more: false,
      object: 'list',
      url: '',
      total_count: null,
    },
    error: null,
  } as never)
  mocks.workClient.events.retrieve.mockResolvedValue({
    data: workEvent(),
    error: null,
  } as never)
  mocks.workClient.events.create.mockResolvedValue({
    data: workEvent(),
    error: null,
  } as never)
  mocks.workClient.events.update.mockResolvedValue({
    data: workEvent(),
    error: null,
  } as never)
  mocks.workClient.events.delete.mockResolvedValue({
    data: { object: 'event', id: 'event_1', deleted: true },
    error: null,
  } as never)
  mocks.workClient.calendars.ensurePrimary.mockResolvedValue({
    data: { id: 'cal_primary_1' },
    error: null,
  } as never)
  mocks.workClient.eventParticipants.list.mockResolvedValue({
    data: {
      data: [],
      has_more: false,
      object: 'list',
      url: '',
      total_count: null,
    },
    error: null,
  } as never)
  mocks.workClient.eventParticipants.create.mockResolvedValue({
    data: participantRow(),
    error: null,
  } as never)
  mocks.workClient.eventParticipants.update.mockResolvedValue({
    data: participantRow(),
    error: null,
  } as never)
  mocks.workClient.eventParticipants.delete.mockResolvedValue({
    data: { object: 'event_participant', id: 'part_1', deleted: true },
    error: null,
  } as never)
})

describe('CRM events service', () => {
  it('list filters by exact Work context service crm resource request id requestId', async () => {
    const ev = workEvent()
    mocks.workClient.events.list.mockResolvedValue({
      data: {
        data: [ev],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = (await service.list(ORG, REQ)) as { id: string }[]
    expect(result).toHaveLength(1)
    expect(mocks.workClient.events.list).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        context: { service: 'crm', resource: 'request', id: REQ },
      })
    )
    expect(mocks.crmRequestWorkContext).toHaveBeenCalledWith(REQ)
  })

  it('event belonging to different request is not returned on retrieve', async () => {
    const other = workEvent({
      context: { service: 'crm', resource: 'request', id: 'req_other' },
    })
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: other,
      error: null,
    } as never)
    const result = await service.retrieve(ORG, REQ, 'event_spanish_town_1')
    expect(result).toBeNull()
  })

  it('request that does not exist returns crm/request-not-found as value not throw', async () => {
    const err = { code: 'crm/request-not-found', message: 'x', httpStatus: 404 }
    mocks.requireRequestContext.mockResolvedValue(err as never)
    const result = await service.list(ORG, 'missing_req')
    expect(result).toEqual(err)
    expect(mocks.workClient.events.list).not.toHaveBeenCalled()
  })

  it('creates timed event with calendarId', async () => {
    const result = await service.create(ORG, REQ, {
      calendarId: 'cal_1',
      title: 'Review',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(result).toEqual(expect.objectContaining({ title: 'Client Review' }))
    expect(mocks.workClient.events.create).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        calendarId: 'cal_1',
        allDay: false,
        startAt: 1_788_000_000,
      })
    )
    expect(mocks.workClient.events.create).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        context: { service: 'crm', resource: 'request', id: REQ },
      })
    )
  })

  it('creates all-day event', async () => {
    const allDayEvent = workEvent({
      allDay: true,
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: '2026-09-02',
      endDate: '2026-09-03',
    })
    mocks.workClient.events.create.mockResolvedValue({
      data: allDayEvent,
      error: null,
    } as never)
    const result = await service.create(ORG, REQ, {
      calendarId: 'cal_1',
      title: 'Holiday',
      allDay: true,
      startDate: '2026-09-02',
      endDate: '2026-09-03',
      createdBy: 'user_kingston_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ allDay: true, startDate: '2026-09-02' })
    )
    expect(mocks.workClient.events.create).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ allDay: true, startDate: '2026-09-02' })
    )
  })

  it('create without calendarId ensures primary calendar', async () => {
    await service.create(ORG, REQ, {
      title: 'No Cal',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(mocks.workClient.calendars.ensurePrimary).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ userId: 'user_kingston_1' })
    )
    expect(mocks.workClient.events.create).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ calendarId: 'cal_primary_1' })
    )
  })

  it('retrieve returns serialized request_event', async () => {
    const result = (await service.retrieve(
      ORG,
      REQ,
      'event_spanish_town_1'
    )) as { object: string; requestId: string }
    expect(result.object).toBe('request_event')
    expect(result.requestId).toBe(REQ)
    expect(result).toEqual(expect.objectContaining({ tenantId }))
  })

  it('retrieve returns null when event not found', async () => {
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: null as never,
      error: { code: 'work/event-not-found', message: 'Event not found.' },
    } as never)
    const result = await service.retrieve(ORG, REQ, 'missing')
    expect(result).toBeNull()
  })

  it('Work-tier failure is surfaced as crm/work-unavailable and raw message not leaked', async () => {
    mocks.workClient.events.list.mockResolvedValue({
      data: null as never,
      error: {
        code: 'work/internal',
        message: 'postgres connection failed - secret stack',
      },
    } as never)
    const result = await service.list(ORG, REQ)
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
    expect((result as unknown as Record<string, unknown>).message).not.toMatch(
      /postgres/
    )
    expect(mocks.workClient.events.list).toHaveBeenCalled()
  })

  it('update serializes and validates ownership before updating', async () => {
    const result = await service.update(ORG, REQ, 'event_spanish_town_1', {
      title: 'Updated',
    })
    expect(result).toEqual(
      expect.objectContaining({ id: 'event_spanish_town_1' })
    )
    expect(mocks.workClient.events.update).toHaveBeenCalledWith(
      ORG,
      'event_spanish_town_1',
      { title: 'Updated' }
    )
  })

  it('update returns null when event belongs to other request and never calls update', async () => {
    const other = workEvent({
      context: { service: 'crm', resource: 'request', id: 'req_other' },
    })
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: other,
      error: null,
    } as never)
    const result = await service.update(ORG, REQ, 'event_spanish_town_1', {
      title: 'X',
    })
    expect(result).toBeNull()
    expect(mocks.workClient.events.update).not.toHaveBeenCalled()
  })

  it('remove deletes event when owned', async () => {
    const result = await service.remove(
      ORG,
      REQ,
      'event_spanish_town_1',
      'user_1'
    )
    expect(result).toEqual(
      expect.objectContaining({ deleted: true, id: 'event_spanish_town_1' })
    )
    expect(mocks.workClient.events.delete).toHaveBeenCalledWith(
      ORG,
      'event_spanish_town_1',
      'user_1'
    )
  })

  it('remove returns null when event belongs to other request and never deletes', async () => {
    const other = workEvent({
      context: { service: 'crm', resource: 'request', id: 'req_other' },
    })
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: other,
      error: null,
    } as never)
    const result = await service.remove(
      ORG,
      REQ,
      'event_spanish_town_1',
      'user_1'
    )
    expect(result).toBeNull()
    expect(mocks.workClient.events.delete).not.toHaveBeenCalled()
  })

  it('listParticipants returns participants when event owned', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow()],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = (await service.listParticipants(
      ORG,
      REQ,
      'event_spanish_town_1'
    )) as unknown[]
    expect(result).toHaveLength(1)
    expect(mocks.workClient.eventParticipants.list).toHaveBeenCalledWith(
      ORG,
      'event_spanish_town_1'
    )
  })

  it('listParticipants returns null when event belongs to other request and never lists participants', async () => {
    const other = workEvent({
      context: { service: 'crm', resource: 'request', id: 'req_other' },
    })
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: other,
      error: null,
    } as never)
    const result = await service.listParticipants(
      ORG,
      REQ,
      'event_spanish_town_1'
    )
    expect(result).toBeNull()
    expect(mocks.workClient.eventParticipants.list).not.toHaveBeenCalled()
  })

  it('createParticipant creates and serializes', async () => {
    const result = await service.createParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      { kind: 'USER', participantId: 'user_kingston_1' }
    )
    expect(result).toEqual(
      expect.objectContaining({ object: 'request_event_participant' })
    )
    expect(mocks.workClient.eventParticipants.create).toHaveBeenCalledWith(
      ORG,
      'event_spanish_town_1',
      { kind: 'USER', participantId: 'user_kingston_1' }
    )
  })

  it('createParticipant returns work-unavailable on Work failure and does not leak raw message', async () => {
    mocks.workClient.eventParticipants.create.mockResolvedValue({
      data: null as never,
      error: {
        code: 'work/internal',
        message: 'raw provider error with stack',
      },
    } as never)
    const result = await service.createParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      { kind: 'USER', participantId: 'user_1' }
    )
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
    expect((result as unknown as Record<string, unknown>).message).not.toMatch(
      /stack/
    )
  })

  it('updateParticipant updates when owned', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow({ id: 'part_1' })],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = await service.updateParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'part_1',
      { status: 'ACCEPTED' }
    )
    expect(result).toEqual(expect.objectContaining({ id: 'part_1' }))
  })

  it('updateParticipant returns null when participant not found', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = await service.updateParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'missing',
      { status: 'ACCEPTED' }
    )
    expect(result).toBeNull()
  })

  it('removeParticipant deletes when owned', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow()],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)

    const result = await service.removeParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'part_1'
    )
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(mocks.workClient.eventParticipants.delete).toHaveBeenCalledWith(
      ORG,
      'event_spanish_town_1',
      'part_1'
    )
  })

  it('list handles pagination across multiple pages', async () => {
    const ev1 = workEvent({ id: 'event_1' })
    const ev2 = workEvent({ id: 'event_2' })
    mocks.workClient.events.list
      .mockResolvedValueOnce({
        data: {
          data: [ev1],
          has_more: true,
          object: 'list',
          url: '',
          total_count: null,
        },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: {
          data: [ev2],
          has_more: false,
          object: 'list',
          url: '',
          total_count: null,
        },
        error: null,
      } as never)
    const result = (await service.list(ORG, REQ)) as { id: string }[]
    expect(result).toHaveLength(2)
    expect(mocks.workClient.events.list).toHaveBeenCalledTimes(2)
  })

  it('create returns work-unavailable when ensurePrimary fails', async () => {
    mocks.workClient.calendars.ensurePrimary.mockResolvedValue({
      data: null as never,
      error: { code: 'work/internal', message: 'fail' },
    } as never)
    const result = await service.create(ORG, REQ, {
      title: 'X',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      createdBy: 'user_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ code: 'crm/work-unavailable' })
    )
    expect(mocks.workClient.events.create).not.toHaveBeenCalled()
  })

  it('lists events with the exact crm request context for the given request id', async () => {
    mocks.workClient.events.list.mockResolvedValue({
      data: {
        data: [workEvent()],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = await service.list(ORG, REQ)
    expect(mocks.workClient.events.list).toHaveBeenCalledWith(ORG, {
      context: { service: 'crm', resource: 'request', id: REQ },
      limit: 100,
    })
    expect(result).toEqual([
      expect.objectContaining({
        object: 'request_event',
        requestId: REQ,
        tenantId,
      }),
    ])
  })

  it('create forwards the full timed payload with the crm context unchanged', async () => {
    const result = await service.create(ORG, REQ, {
      calendarId: 'cal_1',
      title: 'Port Visit',
      description: 'Inspect berth 4',
      location: 'Kingston Wharves',
      status: 'TENTATIVE',
      busyStatus: 'FREE',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(mocks.workClient.events.create).toHaveBeenCalledWith(ORG, {
      calendarId: 'cal_1',
      context: { service: 'crm', resource: 'request', id: REQ },
      title: 'Port Visit',
      description: 'Inspect berth 4',
      location: 'Kingston Wharves',
      status: 'TENTATIVE',
      busyStatus: 'FREE',
      recurrenceRuleId: null,
      recurrenceId: null,
      createdBy: 'user_kingston_1',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
    })
    expect(result).toEqual(
      expect.objectContaining({
        object: 'request_event',
        title: 'Client Review',
      })
    )
  })

  it('all-day create without a calendar uses the calendarTimeZone for the primary calendar', async () => {
    await service.create(ORG, REQ, {
      title: 'Holiday',
      allDay: true,
      startDate: '2026-09-02',
      endDate: '2026-09-03',
      calendarTimeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(mocks.workClient.calendars.ensurePrimary).toHaveBeenCalledWith(ORG, {
      userId: 'user_kingston_1',
      timeZone: 'America/Jamaica',
    })
  })

  it('create returns crm/work-unavailable without leaking the raw message when the Work event create fails', async () => {
    mocks.workClient.events.create.mockResolvedValue({
      data: null as never,
      error: {
        code: 'work/internal',
        message: 'query failed: select * from events -- secret',
      },
    } as never)
    const result = await service.create(ORG, REQ, {
      calendarId: 'cal_1',
      title: 'X',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      createdBy: 'user_1',
    })
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
    expect((result as unknown as Record<string, unknown>).message).not.toMatch(
      /query failed/
    )
  })

  it('update returns null when Work reports work/event-not-found', async () => {
    mocks.workClient.events.update.mockResolvedValue({
      data: null as never,
      error: { code: 'work/event-not-found', message: 'Event not found.' },
    } as never)
    const result = await service.update(ORG, REQ, 'event_spanish_town_1', {
      title: 'X',
    })
    expect(result).toBeNull()
  })

  it('update surfaces crm/work-unavailable when Work fails with a non-not-found error', async () => {
    mocks.workClient.events.update.mockResolvedValue({
      data: null as never,
      error: { code: 'work/internal', message: 'boom' },
    } as never)
    const result = await service.update(ORG, REQ, 'event_spanish_town_1', {
      title: 'X',
    })
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
  })

  it('remove returns null when Work reports work/event-not-found', async () => {
    mocks.workClient.events.delete.mockResolvedValue({
      data: null as never,
      error: { code: 'work/event-not-found', message: 'Event not found.' },
    } as never)
    const result = await service.remove(
      ORG,
      REQ,
      'event_spanish_town_1',
      'user_1'
    )
    expect(result).toBeNull()
  })

  it('listParticipants surfaces crm/work-unavailable when Work fails', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: null as never,
      error: { code: 'work/internal', message: 'nope' },
    } as never)
    const result = await service.listParticipants(
      ORG,
      REQ,
      'event_spanish_town_1'
    )
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
  })

  it('updateParticipant returns null when Work reports work/event-participant-not-found', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow({ id: 'part_1' })],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    mocks.workClient.eventParticipants.update.mockResolvedValue({
      data: null as never,
      error: {
        code: 'work/event-participant-not-found',
        message: 'Event participant not found.',
      },
    } as never)
    const result = await service.updateParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'part_1',
      { status: 'ACCEPTED' }
    )
    expect(result).toBeNull()
  })

  it('updateParticipant surfaces crm/work-unavailable when the participant list fails', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: null as never,
      error: { code: 'work/internal', message: 'x' },
    } as never)
    const result = await service.updateParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'part_1',
      { status: 'ACCEPTED' }
    )
    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: expect.any(String),
      httpStatus: 502,
    })
  })

  it('removeParticipant returns null when Work reports work/event-participant-not-found', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow({ id: 'part_1' })],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    mocks.workClient.eventParticipants.delete.mockResolvedValue({
      data: null as never,
      error: {
        code: 'work/event-participant-not-found',
        message: 'Event participant not found.',
      },
    } as never)
    const result = await service.removeParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      'part_1'
    )
    expect(result).toBeNull()
  })

  it('createParticipant returns null when the event belongs to another request and never creates', async () => {
    const other = workEvent({
      context: { service: 'crm', resource: 'request', id: 'req_other' },
    })
    mocks.workClient.events.retrieve.mockResolvedValue({
      data: other,
      error: null,
    } as never)
    const result = await service.createParticipant(
      ORG,
      REQ,
      'event_spanish_town_1',
      { kind: 'USER', participantId: 'user_1' }
    )
    expect(result).toBeNull()
    expect(mocks.workClient.eventParticipants.create).not.toHaveBeenCalled()
  })

  it('list returns crm/tenant-not-found as a value without calling Work when the tenant is missing', async () => {
    mocks.requireRequestContext.mockResolvedValue({
      code: 'crm/tenant-not-found',
      message: 'Tenant not found.',
      httpStatus: 404,
    } as never)
    const result = await service.list(ORG, REQ)
    expect(result).toEqual({
      code: 'crm/tenant-not-found',
      message: 'Tenant not found.',
      httpStatus: 404,
    })
    expect(mocks.workClient.events.list).not.toHaveBeenCalled()
  })

  it('serializes participants with the request_event_participant discriminator', async () => {
    mocks.workClient.eventParticipants.list.mockResolvedValue({
      data: {
        data: [participantRow()],
        has_more: false,
        object: 'list',
        url: '',
        total_count: null,
      },
      error: null,
    } as never)
    const result = (await service.listParticipants(
      ORG,
      REQ,
      'event_spanish_town_1'
    )) as unknown as Array<Record<string, unknown>>
    expect(result[0]).toEqual(
      expect.objectContaining({
        object: 'request_event_participant',
        id: 'part_1',
        eventId: 'event_spanish_town_1',
      })
    )
  })

  it('rejects a CRM event create body carrying both timed and all-day fields', () => {
    expect(() =>
      createEventBodySchema.parse({
        title: 'Both Shapes',
        allDay: false,
        startAt: 1_788_000_000,
        endAt: 1_788_003_600,
        timeZone: 'America/Jamaica',
        startDate: '2026-09-02',
        endDate: '2026-09-03',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a CRM event create body carrying neither timed nor all-day fields', () => {
    expect(() =>
      createEventBodySchema.parse({
        title: 'No Shape',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a CRM event create body with endAt before startAt', () => {
    expect(() =>
      createEventBodySchema.parse({
        title: 'Inverted',
        allDay: false,
        startAt: 1_788_003_600,
        endAt: 1_788_000_000,
        timeZone: 'America/Jamaica',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a CRM event create body with endDate before startDate', () => {
    expect(() =>
      createEventBodySchema.parse({
        title: 'Inverted All-Day',
        allDay: true,
        startDate: '2026-09-03',
        endDate: '2026-09-02',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })
})
