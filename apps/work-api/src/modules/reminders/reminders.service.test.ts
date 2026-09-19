import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkReminderInputSchema } from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('../recurrence-rules/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./reminders.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './reminders.repository.js'
import * as service from './reminders.service.js'

const tenant = {
  object: 'work_tenant' as const,
  id: 'work_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reminder_1',
    tenantId: tenant.id,
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'req_1',
    title: 'Follow up',
    note: null,
    remindAt: new Date('2026-09-01T10:00:00.000Z'),
    offsetMinutesBeforeDue: null,
    channel: 'in-app',
    timeZone: 'UTC',
    recurrenceRuleId: null,
    userId: 'user_1',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_1',
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

describe('Work reminders service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant)
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.update).mockResolvedValue(row() as never)
  })

  it('returns workspace missing as a value', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    await expect(service.list('org_1')).resolves.toMatchObject({
      code: 'work/tenant-not-found',
    })
  })

  it('stores a CRM request relation only as opaque context', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
      })
    )
  })

  it('allows a general reminder with no source context', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({
        contextService: null,
        contextResource: null,
        contextId: null,
      }) as never
    )
    const result = await service.create('org_1', {
      title: 'Submit timesheet',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect('code' in result).toBe(false)
    if (!('code' in result)) expect(result.context).toBeNull()
  })

  it('owns unix-seconds conversion instead of the CRM adapter', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ remindAt: expect.any(Date) })
    )
  })

  it('creates an absolute reminder with a null offset', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      contextService: null,
      contextResource: null,
      contextId: null,
      title: 'Follow up',
      note: null,
      remindAt: new Date(1_788_256_800 * 1000),
      offsetMinutesBeforeDue: null,
      channel: 'in-app',
      timeZone: 'UTC',
      recurrenceRuleId: null,
      userId: 'user_1',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'user_1',
    })
  })

  it('creates an offset reminder with a null remindAt', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ remindAt: null, offsetMinutesBeforeDue: 30 }) as never
    )
    const result = await service.create('org_1', {
      title: 'Thirty minutes before due',
      remindAt: null,
      offsetMinutesBeforeDue: 30,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        remindAt: null,
        offsetMinutesBeforeDue: 30,
        channel: 'in-app',
      })
    )
    if ('code' in result) throw new Error('Expected a reminder value.')
    expect(result.remindAt).toBeNull()
    expect(result.offsetMinutesBeforeDue).toBe(30)
    expect(result.channel).toBe('in-app')
  })

  it('creates a reminder with both absolute and offset timing', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ offsetMinutesBeforeDue: 15 }) as never
    )
    await service.create('org_1', {
      title: 'Belt and suspenders',
      remindAt: 1_788_256_800,
      offsetMinutesBeforeDue: 15,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        remindAt: new Date(1_788_256_800 * 1000),
        offsetMinutesBeforeDue: 15,
      })
    )
  })

  it('rejects a create payload with neither timing leg', async () => {
    const parsed = createWorkReminderInputSchema.safeParse({
      title: 'Never fires',
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) throw new Error('Expected validation to fail.')
    expect(parsed.error.issues.map((issue) => issue.message)).toEqual([
      'Either remindAt or offsetMinutesBeforeDue must be provided.',
    ])
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects an update that would clear the last timing leg', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    const result = await service.update('org_1', 'reminder_1', {
      remindAt: null,
    })
    expect(result).toEqual({
      code: 'work/invalid-request',
      message: expect.any(String),
      httpStatus: 422,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('defaults the channel to in-app and serializes it', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'in-app' })
    )
    if ('code' in result) throw new Error('Expected a reminder value.')
    expect(result.channel).toBe('in-app')
  })

  it('round-trips an explicit channel', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ channel: 'email' }) as never
    )
    const result = await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      channel: 'email',
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'email' })
    )
    if ('code' in result) throw new Error('Expected a reminder value.')
    expect(result).toEqual(
      expect.objectContaining({
        object: 'reminder',
        id: 'reminder_1',
        channel: 'email',
      })
    )
  })

  it('serializes offset and channel when retrieving an offset reminder', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({
        contextService: null,
        contextResource: null,
        contextId: null,
        remindAt: null,
        offsetMinutesBeforeDue: 45,
        channel: 'email',
      }) as never
    )
    const result = await service.retrieve('org_1', 'reminder_1')
    expect(result).toEqual(
      expect.objectContaining({
        object: 'reminder',
        id: 'reminder_1',
        organizationId: 'org_1',
        context: null,
        title: 'Follow up',
        note: null,
        remindAt: null,
        offsetMinutesBeforeDue: 45,
        channel: 'email',
        timeZone: 'UTC',
        recurrenceRuleId: null,
        userId: 'user_1',
        status: 'SCHEDULED',
        sentAt: null,
        dismissedAt: null,
        createdBy: 'user_1',
      })
    )
  })

  it('leaves an existing absolute-only reminder working unchanged', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    if ('code' in result) throw new Error('Expected a reminder value.')
    expect(result.remindAt).toBe(1_788_256_800)
    expect(result.offsetMinutesBeforeDue).toBeNull()
    expect(result.channel).toBe('in-app')
    expect(result.timeZone).toBe('UTC')
    expect(result.recurrenceRuleId).toBeNull()
  })
})
