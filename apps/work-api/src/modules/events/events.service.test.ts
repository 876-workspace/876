import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkEventResourceInputSchema,
  updateWorkEventResourceInputSchema,
} from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('../calendars/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('../recurrence-rules/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./events.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as calendars from '../calendars/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './events.repository.js'
import * as service from './events.service.js'

const tenant = {
  id: 'work_tnt_1',
  organizationId: 'org_kingston_1',
  status: 'ACTIVE' as const,
}
const calendar = { id: 'cal_mandeville_1', object: 'calendar' as const }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event_1',
    uid: 'event_1@work.876',
    tenantId: tenant.id,
    calendarId: calendar.id,
    contextService: null,
    contextResource: null,
    contextId: null,
    title: 'Sprint Review',
    description: null,
    location: 'Kingston Office',
    meetingUrl: null,
    status: 'CONFIRMED' as const,
    busyStatus: 'BUSY' as const,
    startAt: new Date('2026-09-01T09:00:00.000Z'),
    endAt: new Date('2026-09-01T10:00:00.000Z'),
    timeZone: 'America/Jamaica',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [] as unknown[],
    createdBy: 'user_kingston_1',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant as never)
  vi.mocked(calendars.retrieve).mockResolvedValue(calendar as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work events service', () => {
  it('create timed event persists startAt/endAt/timeZone', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Sprint Review',
      allDay: false,
      startAt: Math.floor(
        new Date('2026-09-01T09:00:00.000Z').getTime() / 1000
      ),
      endAt: Math.floor(new Date('2026-09-01T10:00:00.000Z').getTime() / 1000),
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ title: 'Sprint Review', allDay: false })
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeZone: 'America/Jamaica' })
    )
  })

  it('create all-day event persists startDate/endDate and no timeZone', async () => {
    const allDayRow = row({
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-02'),
    })
    vi.mocked(repository.create).mockResolvedValue(allDayRow as never)
    const result = await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Company Holiday',
      allDay: true,
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      createdBy: 'user_kingston_1',
    })
    expect(result).toEqual(
      expect.objectContaining({
        allDay: true,
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      })
    )
    expect(repository.create).toHaveBeenCalled()
  })

  it('create with opaque host context round-trips unchanged', async () => {
    const ctxRow = row({
      contextService: 'crm',
      contextResource: 'request',
      contextId: 'req_spanish_town_1',
    })
    vi.mocked(repository.create).mockResolvedValue(ctxRow as never)
    await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Client Meeting',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
      context: {
        service: 'crm',
        resource: 'request',
        id: 'req_spanish_town_1',
      },
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_spanish_town_1',
      })
    )
  })

  it('create returns tenant-not-found and never creates when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', {
      calendarId: calendar.id,
      title: 'X',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ code: 'work/tenant-not-found' })
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create returns calendar-not-found when calendar missing and never creates', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', {
      calendarId: 'missing',
      title: 'X',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'America/Jamaica',
      createdBy: 'user_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ code: 'work/calendar-not-found' })
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('retrieve returns event when found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_found' }) as never
    )
    const result = await service.retrieve('org_kingston_1', 'event_found')
    expect(result).toEqual(
      expect.objectContaining({ id: 'event_found', object: 'event' })
    )
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'event_found')
  })

  it('retrieve returns null when not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.retrieve('org_kingston_1', 'missing')
    expect(result).toBeNull()
  })

  it('retrieve returns tenant-not-found without querying repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.retrieve('org_missing', 'event_1')
    expect(result).toEqual(
      expect.objectContaining({ code: 'work/tenant-not-found' })
    )
    expect(repository.retrieve).not.toHaveBeenCalled()
  })

  it('list returns events with hasMore', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'event_a' }),
      row({ id: 'event_b' }),
    ] as never)
    const result = (await service.list('org_kingston_1', {})) as {
      data: unknown[]
      hasMore: boolean
    }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(false)
  })

  it('list signals hasMore when over limit', async () => {
    const many = Array.from({ length: 3 }, (_, i) => row({ id: `event_${i}` }))
    vi.mocked(repository.list).mockResolvedValue(many as never)
    const result = (await service.list('org_kingston_1', { limit: 2 })) as {
      data: unknown[]
      hasMore: boolean
    }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('list filters by calendarId', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    await service.list('org_kingston_1', { calendarId: calendar.id })
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ calendarId: calendar.id })
    )
  })

  it('list filters by context', async () => {
    vi.mocked(repository.list).mockResolvedValue([])
    await service.list('org_kingston_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
      })
    )
  })

  it('update changes status and busyStatus', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_1' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'event_1', status: 'CANCELLED', busyStatus: 'FREE' }) as never
    )
    const result = await service.update('org_kingston_1', 'event_1', {
      status: 'CANCELLED',
      busyStatus: 'FREE',
    })
    expect(result).toEqual(
      expect.objectContaining({ status: 'CANCELLED', busyStatus: 'FREE' })
    )
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({ status: 'CANCELLED', busyStatus: 'FREE' })
    )
  })

  it('update returns null when event not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', {
      title: 'New',
    })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update title only', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_1' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'event_1', title: 'New Title' }) as never
    )
    await service.update('org_kingston_1', 'event_1', { title: 'New Title' })
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({ title: 'New Title' })
    )
  })

  it('remove deletes event', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_1' }) as never
    )
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'event',
      id: 'event_1',
      deleted: true,
    } as never)
    const result = await service.remove('org_kingston_1', 'event_1', 'user_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('event_1', 'user_1')
  })

  it('remove returns null when event not found and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', 'missing', 'user_1')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('create with status CONFIRMED persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ status: 'CONFIRMED' }) as never
    )
    await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'X',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      status: 'CONFIRMED',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMED' })
    )
  })

  it('create with location persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ location: 'Montego Bay' }) as never
    )
    await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Onsite',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      location: 'Montego Bay',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Montego Bay' })
    )
  })

  it('create with a meeting url persists and serializes it', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ meetingUrl: 'https://meet.876.dev/standup' }) as never
    )
    const result = await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Standup',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      meetingUrl: 'https://meet.876.dev/standup',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ meetingUrl: 'https://meet.876.dev/standup' })
    )
    expect(result).toEqual(
      expect.objectContaining({ meetingUrl: 'https://meet.876.dev/standup' })
    )
  })

  it('create without a meeting url stores null', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({}) as never)
    const result = await service.create('org_kingston_1', {
      calendarId: calendar.id,
      title: 'Onsite',
      allDay: false,
      startAt: 1_788_000_000,
      endAt: 1_788_003_600,
      timeZone: 'UTC',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ meetingUrl: null })
    )
    expect(result).toEqual(expect.objectContaining({ meetingUrl: null }))
  })

  it('update clears a meeting url when passed null', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ meetingUrl: 'https://meet.876.dev/standup' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(row({}) as never)
    const result = await service.update('org_kingston_1', 'event_1', {
      meetingUrl: null,
    })
    expect(repository.update).toHaveBeenCalledTimes(1)
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({ meetingUrl: null })
    )
    expect(result).toEqual(expect.objectContaining({ meetingUrl: null }))
  })

  it('update leaves a meeting url alone when the field is absent', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ meetingUrl: 'https://meet.876.dev/standup' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ meetingUrl: 'https://meet.876.dev/standup' }) as never
    )
    await service.update('org_kingston_1', 'event_1', { title: 'Renamed' })
    const patch = vi.mocked(repository.update).mock.calls[0]?.[1]
    expect(patch).not.toHaveProperty('meetingUrl')
  })

  it('returns tenant-inactive and never lists when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({
      ...tenant,
      status: 'SUSPENDED',
    } as never)
    const result = await service.list('org_kingston_1', {})
    expect(result).toEqual(
      expect.objectContaining({ code: 'work/tenant-inactive' })
    )
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('rejects a create payload carrying both timed and all-day fields', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'Both Shapes',
        allDay: false,
        startAt: 1_788_271_200,
        endAt: 1_788_274_800,
        timeZone: 'America/Jamaica',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a create payload carrying neither timed nor all-day fields', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'No Shape',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a create payload whose endAt is not after startAt', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'Inverted',
        allDay: false,
        startAt: 1_788_274_800,
        endAt: 1_788_271_200,
        timeZone: 'America/Jamaica',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a create payload whose endDate is not after startDate', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'Inverted All-Day',
        allDay: true,
        startDate: '2026-09-02',
        endDate: '2026-09-01',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a timed create payload with an empty time zone', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'No Zone',
        allDay: false,
        startAt: 1_788_271_200,
        endAt: 1_788_274_800,
        timeZone: '   ',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an all-day create payload with a malformed start date', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'Bad Date',
        allDay: true,
        startDate: '09/01/2026',
        endDate: '2026-09-02',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an unknown field in a create payload via the strict schema', () => {
    expect(() =>
      createWorkEventResourceInputSchema.parse({
        calendarId: calendar.id,
        title: 'Extra Field',
        allDay: false,
        startAt: 1_788_271_200,
        endAt: 1_788_274_800,
        timeZone: 'America/Jamaica',
        createdBy: 'user_kingston_1',
        organizer: 'user_kingston_2',
      })
    ).toThrow()
  })

  it('rejects an empty update payload via the real schema', () => {
    expect(() => updateWorkEventResourceInputSchema.parse({})).toThrow()
  })

  it('update converting an all-day event to timed stores dates as null and clears timeZone only when provided', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        startAt: null,
        endAt: null,
        timeZone: null,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-02'),
      }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({
        startAt: new Date('2026-09-01T09:00:00.000Z'),
        endAt: new Date('2026-09-01T10:00:00.000Z'),
        timeZone: 'America/Jamaica',
        startDate: null,
        endDate: null,
      }) as never
    )
    await service.update('org_kingston_1', 'event_1', {
      allDay: false,
      startAt: 1_788_282_000,
      endAt: 1_788_285_600,
      timeZone: 'America/Jamaica',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({
        startDate: null,
        endDate: null,
        startAt: new Date(1_788_282_000 * 1000),
        endAt: new Date(1_788_285_600 * 1000),
        timeZone: 'America/Jamaica',
      })
    )
  })

  it('update converting a timed event to all-day stores times as null', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        startAt: new Date('2026-09-01T09:00:00.000Z'),
        endAt: new Date('2026-09-01T10:00:00.000Z'),
        timeZone: 'America/Jamaica',
        startDate: null,
        endDate: null,
      }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({
        startAt: null,
        endAt: null,
        timeZone: null,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-02'),
      }) as never
    )
    await service.update('org_kingston_1', 'event_1', {
      allDay: true,
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({
        startAt: null,
        endAt: null,
        timeZone: null,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-02T00:00:00.000Z'),
      })
    )
  })

  it('update on a timed event with endAt before startAt returns invalid-request and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        startAt: new Date('2026-09-01T09:00:00.000Z'),
        endAt: new Date('2026-09-01T10:00:00.000Z'),
        timeZone: 'America/Jamaica',
      }) as never
    )
    const result = await service.update('org_kingston_1', 'event_1', {
      startAt: 1_788_285_600,
      endAt: 1_788_282_000,
    })
    expect(result).toEqual({
      code: 'work/invalid-request',
      message: expect.any(String),
      httpStatus: 422,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update on an all-day event with endDate before startDate returns invalid-request and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        startAt: null,
        endAt: null,
        timeZone: null,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-02'),
      }) as never
    )
    const result = await service.update('org_kingston_1', 'event_1', {
      startDate: '2026-09-03',
      endDate: '2026-09-02',
    })
    expect(result).toEqual({
      code: 'work/invalid-request',
      message: expect.any(String),
      httpStatus: 422,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update returning to timed without a time zone returns invalid-request and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        startAt: null,
        endAt: null,
        timeZone: null,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-02'),
      }) as never
    )
    const result = await service.update('org_kingston_1', 'event_1', {
      allDay: false,
      startAt: 1_788_282_000,
      endAt: 1_788_285_600,
    })
    expect(result).toEqual({
      code: 'work/invalid-request',
      message: expect.any(String),
      httpStatus: 422,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update with an invalid calendar returns calendar-not-found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_1' }) as never
    )
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.update('org_kingston_1', 'event_1', {
      calendarId: 'missing',
    })
    expect(result).toEqual({
      code: 'work/calendar-not-found',
      message: expect.any(String),
      httpStatus: 404,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('create serializes the event with the object discriminator and Unix-second timestamps', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'event_1' }) as never
    )
    const result = await service.retrieve('org_kingston_1', 'event_1')
    expect(result).toEqual({
      object: 'event',
      id: 'event_1',
      uid: 'event_1@work.876',
      organizationId: 'org_kingston_1',
      calendarId: calendar.id,
      context: null,
      title: 'Sprint Review',
      description: null,
      location: 'Kingston Office',
      meetingUrl: null,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      allDay: false,
      startAt: 1_788_253_200,
      endAt: 1_788_256_800,
      timeZone: 'America/Jamaica',
      startDate: null,
      endDate: null,
      recurrenceRuleId: null,
      recurrenceId: null,
      participants: [],
      createdBy: 'user_kingston_1',
      createdAt: 1_788_091_200,
      updatedAt: 1_788_091_200,
    })
  })

  it('serializes an all-day event with startDate and endDate strings', async () => {
    const allDay = row({
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-02'),
    })
    vi.mocked(repository.retrieve).mockResolvedValue(allDay as never)
    const result = (await service.retrieve('org_kingston_1', 'event_1')) as {
      startDate: string | null
      endDate: string | null
      allDay: boolean
    }
    expect(result.allDay).toBe(true)
    expect(result.startDate).toBe('2026-09-01')
    expect(result.endDate).toBe('2026-09-02')
  })

  it('list passes from/to as Date objects converted from Unix seconds', async () => {
    vi.mocked(repository.list).mockResolvedValue([] as never)
    await service.list('org_kingston_1', {
      from: 1_788_271_200,
      to: 1_788_300_000,
    })
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        from: new Date(1_788_271_200 * 1000),
        to: new Date(1_788_300_000 * 1000),
      })
    )
  })

  it('list filters by status and forwards it to the repository', async () => {
    vi.mocked(repository.list).mockResolvedValue([] as never)
    await service.list('org_kingston_1', { status: 'CANCELLED' })
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ status: 'CANCELLED' })
    )
  })

  it('remove returns tenant-not-found and never removes when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.remove('org_missing', 'event_1', 'user_1')
    expect(result).toEqual({
      code: 'work/tenant-not-found',
      message: expect.any(String),
      httpStatus: 404,
    })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('update clears the context when context null is passed', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
      }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({
        contextService: null,
        contextResource: null,
        contextId: null,
      }) as never
    )
    await service.update('org_kingston_1', 'event_1', { context: null })
    expect(repository.update).toHaveBeenCalledWith(
      'event_1',
      expect.objectContaining({
        contextService: null,
        contextResource: null,
        contextId: null,
      })
    )
  })
})
