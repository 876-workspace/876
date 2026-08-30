import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkCalendarSubscriptionInputSchema,
  updateWorkCalendarSubscriptionInputSchema,
} from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('../calendars/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./calendar-subscriptions.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as calendars from '../calendars/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './calendar-subscriptions.repository.js'
import * as service from './calendar-subscriptions.service.js'

const tenant = {
  id: 'work_tnt_1',
  organizationId: 'org_kingston_1',
  status: 'ACTIVE' as const,
}
const calendar = { id: 'cal_mandeville_1', object: 'calendar' as const }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'calsub_1',
    tenantId: tenant.id,
    calendarId: calendar.id,
    userId: 'user_kingston_1',
    role: 'VIEWER' as const,
    color: null,
    isVisible: true,
    defaultReminderMinutes: [] as number[],
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant as never)
  vi.mocked(calendars.retrieve).mockResolvedValue(calendar as never)
})

describe('Work calendar-subscriptions service', () => {
  it('create persists subscription with defaults', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_kingston_1', calendar.id, {
      userId: 'user_kingston_1',
    })
    expect(result).toEqual(
      expect.objectContaining({ userId: 'user_kingston_1', role: 'VIEWER' })
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        calendarId: calendar.id,
        role: 'VIEWER',
        isVisible: true,
      })
    )
  })

  it('create with role EDITOR persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ role: 'EDITOR' }) as never
    )
    await service.create('org_kingston_1', calendar.id, {
      userId: 'user_kingston_2',
      role: 'EDITOR',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'EDITOR' })
    )
  })

  it('create with colour and visibility and default reminders persists them', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({
        color: '#ff0000',
        isVisible: false,
        defaultReminderMinutes: [15],
      }) as never
    )
    await service.create('org_kingston_1', calendar.id, {
      userId: 'user_1',
      color: '#ff0000',
      isVisible: false,
      defaultReminderMinutes: [15],
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#ff0000',
        isVisible: false,
        defaultReminderMinutes: [15],
      })
    )
  })

  it('list returns subscriptions for calendar', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'calsub_a' }),
      row({ id: 'calsub_b' }),
    ] as never)
    const result = (await service.list('org_kingston_1', calendar.id)) as {
      data: unknown[]
    }
    expect(result.data).toHaveLength(2)
    expect(repository.list).toHaveBeenCalledWith(tenant.id, calendar.id)
  })

  it('update changes role and colour', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'calsub_1' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'calsub_1', role: 'EDITOR', color: '#00ff00' }) as never
    )
    const result = await service.update(
      'org_kingston_1',
      calendar.id,
      'calsub_1',
      { role: 'EDITOR', color: '#00ff00' }
    )
    expect(result).toEqual(
      expect.objectContaining({ role: 'EDITOR', color: '#00ff00' })
    )
    expect(repository.update).toHaveBeenCalledWith(
      'calsub_1',
      expect.objectContaining({ role: 'EDITOR', color: '#00ff00' })
    )
  })

  it('update returns null when subscription not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update(
      'org_kingston_1',
      calendar.id,
      'missing',
      { role: 'EDITOR' }
    )
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes VIEWER subscription', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ role: 'VIEWER' }) as never
    )
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'calendar_subscription',
      id: 'calsub_1',
      deleted: true,
    } as never)
    const result = await service.remove(
      'org_kingston_1',
      calendar.id,
      'calsub_1'
    )
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('calsub_1')
  })

  it('remove rejects OWNER subscription and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ role: 'OWNER' }) as never
    )
    const result = await service.remove(
      'org_kingston_1',
      calendar.id,
      'calsub_1'
    )
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns null when subscription not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove(
      'org_kingston_1',
      calendar.id,
      'missing'
    )
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('create returns null when calendar in another tenant and never creates', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing_cal', {
      userId: 'user_1',
    })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('list returns null when calendar not found and never lists', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.list('org_kingston_1', 'missing_cal')
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('create with defaultReminderMinutes empty persists empty array', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ defaultReminderMinutes: [] }) as never
    )
    await service.create('org_kingston_1', calendar.id, {
      userId: 'user_1',
      defaultReminderMinutes: [],
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ defaultReminderMinutes: [] })
    )
  })

  it('update with isVisible false persists it', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ isVisible: true }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ isVisible: false }) as never
    )
    await service.update('org_kingston_1', calendar.id, 'calsub_1', {
      isVisible: false,
    })
    expect(repository.update).toHaveBeenCalledWith(
      'calsub_1',
      expect.objectContaining({ isVisible: false })
    )
  })

  it('serializes the subscription with object discriminator and Unix-second timestamps', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'calsub_1' }),
    ] as never)
    const result = (await service.list('org_kingston_1', calendar.id)) as {
      data: unknown[]
    }
    expect(result.data).toEqual([
      {
        object: 'calendar_subscription',
        id: 'calsub_1',
        organizationId: 'org_kingston_1',
        calendarId: calendar.id,
        userId: 'user_kingston_1',
        role: 'VIEWER',
        color: null,
        isVisible: true,
        defaultReminderMinutes: [],
        createdAt: 1_788_091_200,
        updatedAt: 1_788_091_200,
      },
    ])
  })

  it('create persists EDITOR role with colour and default reminders via the real schema path', async () => {
    const parsed = createWorkCalendarSubscriptionInputSchema.parse({
      userId: 'user_kingston_2',
      role: 'EDITOR',
      color: '#3366ff',
      isVisible: false,
      defaultReminderMinutes: [15, 60],
    })
    expect(parsed).toEqual({
      userId: 'user_kingston_2',
      role: 'EDITOR',
      color: '#3366ff',
      isVisible: false,
      defaultReminderMinutes: [15, 60],
    })
  })

  it('rejects a subscription payload with a negative reminder minute via the real schema', () => {
    expect(() =>
      createWorkCalendarSubscriptionInputSchema.parse({
        userId: 'user_kingston_1',
        defaultReminderMinutes: [-5],
      })
    ).toThrow()
  })

  it('rejects a subscription payload with an unknown role via the real schema', () => {
    expect(() =>
      createWorkCalendarSubscriptionInputSchema.parse({
        userId: 'user_kingston_1',
        role: 'ADMIN',
      })
    ).toThrow()
  })

  it('rejects an empty subscription update payload via the real schema', () => {
    expect(() => updateWorkCalendarSubscriptionInputSchema.parse({})).toThrow()
  })

  it('create returns null when the tenant is missing and never creates', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', calendar.id, {
      userId: 'user_1',
    })
    expect(result).toBeNull()
    expect(calendars.retrieve).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create returns null when the calendar is in another tenant and never creates', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing_cal', {
      userId: 'user_1',
    })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update returns null when the calendar is missing and never updates', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.update(
      'org_kingston_1',
      'missing_cal',
      'calsub_1',
      { role: 'EDITOR' }
    )
    expect(result).toBeNull()
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove returns null when the calendar is missing and never removes', async () => {
    vi.mocked(calendars.retrieve).mockResolvedValue(null as never)
    const result = await service.remove(
      'org_kingston_1',
      'missing_cal',
      'calsub_1'
    )
    expect(result).toBeNull()
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('update changes default reminder minutes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'calsub_1', defaultReminderMinutes: [] }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'calsub_1', defaultReminderMinutes: [30] }) as never
    )
    await service.update('org_kingston_1', calendar.id, 'calsub_1', {
      defaultReminderMinutes: [30],
    })
    expect(repository.update).toHaveBeenCalledWith(
      'calsub_1',
      expect.objectContaining({ defaultReminderMinutes: [30] })
    )
  })
})
