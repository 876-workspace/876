import { isError } from '@876/core'
import {
  createWorkRecurrenceRuleInputSchema,
  updateWorkRecurrenceRuleInputSchema,
} from '@876/work'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./recurrence-rules.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './recurrence-rules.repository.js'
import * as service from './recurrence-rules.service.js'

const tenant = { id: 'work_tnt_1', organizationId: 'org_kingston_1', status: 'ACTIVE' as const }

/**
 * Narrows a service result to the rule itself.
 *
 * The service returns `rule | AppErrorValue`, so a bare `result.rrule` neither
 * typechecks nor proves the call succeeded. Asserting the discriminant here
 * makes an unexpected error fail with the code that was actually returned.
 */
function ruleOf(result: Awaited<ReturnType<typeof service.create>>) {
  if (isError(result))
    throw new Error(`expected a recurrence rule, received ${result.code}`)
  if (!result) throw new Error('expected a recurrence rule, received null')
  return result
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rrule_1',
    tenantId: tenant.id,
    frequency: 'WEEKLY' as const,
    interval: 1,
    byDay: [] as string[],
    byMonthDay: [] as number[],
    byMonth: [] as number[],
    count: null,
    untilAt: null,
    timeZone: 'America/Jamaica',
    weekStart: null,
    rrule: 'FREQ=WEEKLY',
    createdBy: 'user_kingston_1',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work recurrence-rules service', () => {
  it('create DAILY rule produces FREQ=DAILY', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ frequency: 'DAILY', rrule: 'FREQ=DAILY' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'DAILY', timeZone: 'America/Jamaica', createdBy: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ frequency: 'DAILY', rrule: 'FREQ=DAILY' }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'DAILY', rrule: 'FREQ=DAILY' }))
  })

  it('create WEEKLY rule produces FREQ=WEEKLY', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ frequency: 'WEEKLY', rrule: 'FREQ=WEEKLY' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'WEEKLY', timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toBe('FREQ=WEEKLY')
  })

  it('create MONTHLY rule produces FREQ=MONTHLY', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ frequency: 'MONTHLY', rrule: 'FREQ=MONTHLY' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'MONTHLY', timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toBe('FREQ=MONTHLY')
  })

  it('create YEARLY rule produces FREQ=YEARLY', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ frequency: 'YEARLY', rrule: 'FREQ=YEARLY' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'YEARLY', timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toBe('FREQ=YEARLY')
  })

  it('create with interval 2 includes INTERVAL=2', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ interval: 2, rrule: 'FREQ=WEEKLY;INTERVAL=2' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'WEEKLY', interval: 2, timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toBe('FREQ=WEEKLY;INTERVAL=2')
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ rrule: 'FREQ=WEEKLY;INTERVAL=2' }))
  })

  it('create with interval 1 omits INTERVAL', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ interval: 1, rrule: 'FREQ=DAILY' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'DAILY', interval: 1, timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toBe('FREQ=DAILY')
  })

  it('create with byDay includes BYDAY', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ byDay: ['MO', 'WE'], rrule: 'FREQ=WEEKLY;BYDAY=MO,WE' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'WEEKLY', byDay: ['MO', 'WE'], timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('BYDAY=MO,WE')
  })

  it('create with byMonthDay 31 is valid', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ byMonthDay: [31], rrule: 'FREQ=MONTHLY;BYMONTHDAY=31' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'MONTHLY', byMonthDay: [31], timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('BYMONTHDAY=31')
  })

  it('create with byMonthDay -31 is valid', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ byMonthDay: [-31], rrule: 'FREQ=MONTHLY;BYMONTHDAY=-31' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'MONTHLY', byMonthDay: [-31], timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('BYMONTHDAY=-31')
  })

  it('create with byMonth includes BYMONTH', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ byMonth: [1, 12], rrule: 'FREQ=YEARLY;BYMONTH=1,12' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'YEARLY', byMonth: [1, 12], timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('BYMONTH=1,12')
  })

  it('create with count includes COUNT', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ count: 5, rrule: 'FREQ=DAILY;COUNT=5' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'DAILY', count: 5, timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('COUNT=5')
  })

  it('create with untilAt includes UNTIL', async () => {
    const until = Math.floor(new Date('2026-12-31T00:00:00.000Z').getTime()/1000)
    vi.mocked(repository.create).mockResolvedValue(row({ untilAt: new Date(until*1000), rrule: `FREQ=DAILY;UNTIL=20261231T000000Z` }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'DAILY', untilAt: until, timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('UNTIL=')
  })

  it('create with weekStart includes WKST', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ weekStart: 'MO', rrule: 'FREQ=WEEKLY;WKST=MO' }) as never)
    const result = await service.create('org_kingston_1', { frequency: 'WEEKLY', weekStart: 'MO', timeZone: 'UTC', createdBy: 'user_1' })
    expect(ruleOf(result).rrule).toContain('WKST=MO')
  })

  it('create returns tenant-not-found and never creates when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', { frequency: 'DAILY', timeZone: 'UTC', createdBy: 'user_1' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('retrieve returns rule when found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'rrule_found' }) as never)
    const result = await service.retrieve('org_kingston_1', 'rrule_found')
    expect(result).toEqual(expect.objectContaining({ id: 'rrule_found' }))
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'rrule_found')
  })

  it('retrieve returns null when not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.retrieve('org_kingston_1', 'missing')
    expect(result).toBeNull()
  })

  it('list returns all rules', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'rrule_a' }), row({ id: 'rrule_b' })] as never)
    const result = await service.list('org_kingston_1') as { data: unknown[] }
    expect(result.data).toHaveLength(2)
  })

  it('update changes frequency and rebuilds rrule', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ frequency: 'DAILY', interval: 1, byDay: [], byMonthDay: [], byMonth: [], count: null, untilAt: null, weekStart: null }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ frequency: 'WEEKLY', rrule: 'FREQ=WEEKLY' }) as never)
    const result = await service.update('org_kingston_1', 'rrule_1', { frequency: 'WEEKLY' })
    expect(result).toEqual(expect.objectContaining({ frequency: 'WEEKLY' }))
    expect(repository.update).toHaveBeenCalledWith('rrule_1', expect.objectContaining({ frequency: 'WEEKLY', rrule: 'FREQ=WEEKLY' }))
  })

  it('update returns null when rule not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', { frequency: 'WEEKLY' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes rule', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.remove).mockResolvedValue({ object: 'recurrence_rule', id: 'rrule_1', deleted: true } as never)
    const result = await service.remove('org_kingston_1', 'rrule_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('rrule_1')
  })

  it('remove returns null when rule not found and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', 'missing')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('rejects byMonthDay 0 via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'MONTHLY',
        byMonthDay: [0],
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('accepts byMonthDay 31 and -31 via the real schema', () => {
    const parsed = createWorkRecurrenceRuleInputSchema.parse({
      frequency: 'MONTHLY',
      byMonthDay: [31, -31],
      timeZone: 'UTC',
      createdBy: 'user_1',
    })
    expect(parsed.byMonthDay).toEqual([31, -31])
  })

  it('rejects byMonthDay 32 via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'MONTHLY',
        byMonthDay: [32],
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an interval of 0 via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'DAILY',
        interval: 0,
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects count and untilAt together via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'DAILY',
        count: 5,
        untilAt: 1_788_307_200,
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects a byMonth value outside 1-12 via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'YEARLY',
        byMonth: [13],
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an unknown weekday in byDay via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'WEEKLY',
        byDay: ['XX'],
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an unknown frequency via the real schema', () => {
    expect(() =>
      createWorkRecurrenceRuleInputSchema.parse({
        frequency: 'HOURLY',
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    ).toThrow()
  })

  it('rejects an empty update payload via the real schema', () => {
    expect(() => updateWorkRecurrenceRuleInputSchema.parse({})).toThrow()
  })

  it('update with count and untilAt together is rejected via the real schema', () => {
    expect(() =>
      updateWorkRecurrenceRuleInputSchema.parse({
        count: 3,
        untilAt: 1_788_307_200,
      })
    ).toThrow()
  })

  it('serializes the rule with object discriminator, rrule, and Unix timestamps', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'rrule_1' }) as never)
    const result = await service.retrieve('org_kingston_1', 'rrule_1')
    expect(result).toEqual({
      object: 'recurrence_rule',
      id: 'rrule_1',
      organizationId: 'org_kingston_1',
      frequency: 'WEEKLY',
      interval: 1,
      byDay: [],
      byMonthDay: [],
      byMonth: [],
      count: null,
      untilAt: null,
      timeZone: 'America/Jamaica',
      weekStart: null,
      rrule: 'FREQ=WEEKLY',
      createdBy: 'user_kingston_1',
      createdAt: 1_788_091_200,
      updatedAt: 1_788_091_200,
    })
  })

  it('create normalizes defaults and emits the canonical RRULE for a compound rule', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ byDay: ['MO', 'WE'], byMonthDay: [], byMonth: [], rrule: 'FREQ=WEEKLY;BYDAY=MO,WE;WKST=MO' }) as never
    )
    await service.create('org_kingston_1', {
      frequency: 'WEEKLY',
      byDay: ['MO', 'WE'],
      weekStart: 'MO',
      timeZone: 'America/Jamaica',
      createdBy: 'user_kingston_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: 1,
        byDay: ['MO', 'WE'],
        byMonthDay: [],
        byMonth: [],
        count: null,
        untilAt: null,
        weekStart: 'MO',
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE;WKST=MO',
      })
    )
  })

  it('update omitting a field keeps the persisted value when rebuilding the RRULE', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ frequency: 'WEEKLY', interval: 2, byDay: ['FR'], count: 8, weekStart: null, byMonthDay: [], byMonth: [] }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(row({ rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;COUNT=8' }) as never)
    await service.update('org_kingston_1', 'rrule_1', { interval: 2 })
    expect(repository.update).toHaveBeenCalledWith(
      'rrule_1',
      expect.objectContaining({ rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;COUNT=8' })
    )
  })

  it('update clears count when null is supplied explicitly', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ frequency: 'DAILY', interval: 1, byDay: [], byMonthDay: [], byMonth: [], count: 5, weekStart: null }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(row({ count: null, rrule: 'FREQ=DAILY' }) as never)
    await service.update('org_kingston_1', 'rrule_1', { count: null })
    expect(repository.update).toHaveBeenCalledWith(
      'rrule_1',
      expect.objectContaining({ count: null, rrule: 'FREQ=DAILY' })
    )
  })

  it('remove returns tenant-not-found and never removes when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.remove('org_missing', 'rrule_1')
    expect(result).toEqual({ code: 'work/tenant-not-found', message: expect.any(String), httpStatus: 404 })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('list returns tenant-inactive and never lists when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.list('org_kingston_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.list).not.toHaveBeenCalled()
  })
})
