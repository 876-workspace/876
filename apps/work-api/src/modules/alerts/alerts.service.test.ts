import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkAlertInputSchema, updateWorkAlertInputSchema } from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./alerts.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  absoluteDue: vi.fn(),
  relativeCandidates: vi.fn(),
  markSent: vi.fn(),
  markDismissed: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './alerts.repository.js'
import * as service from './alerts.service.js'

const tenant = { id: 'work_tnt_1', organizationId: 'org_kingston_1', status: 'ACTIVE' as const }

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert_1',
    tenantId: tenant.id,
    taskId: 'task_montego_1',
    eventId: null,
    userId: 'user_kingston_1',
    triggerType: 'ABSOLUTE' as const,
    triggerAt: new Date('2026-09-01T08:00:00.000Z'),
    offsetSeconds: null,
    action: 'NOTIFICATION' as const,
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_kingston_1',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    task: null,
    event: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work alerts service', () => {
  it('create ABSOLUTE alert for task persists triggerAt', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ triggerType: 'ABSOLUTE', triggerAt: new Date('2026-09-01T08:00:00.000Z'), offsetSeconds: null }) as never)
    const at = Math.floor(new Date('2026-09-01T08:00:00.000Z').getTime()/1000)
    const result = await service.create('org_kingston_1', { taskId: 'task_montego_1', userId: 'user_kingston_1', triggerType: 'ABSOLUTE', triggerAt: at, createdBy: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ triggerType: 'ABSOLUTE', triggerAt: at }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ triggerType: 'ABSOLUTE', taskId: 'task_montego_1', eventId: null }))
  })

  it('create RELATIVE alert with negative offset persists offsetSeconds', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ triggerType: 'RELATIVE', triggerAt: null, offsetSeconds: -900 }) as never)
    const result = await service.create('org_kingston_1', { taskId: 'task_montego_1', userId: 'user_kingston_1', triggerType: 'RELATIVE', offsetSeconds: -900, createdBy: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ triggerType: 'RELATIVE', offsetSeconds: -900 }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ offsetSeconds: -900, triggerAt: null }))
  })

  it('create RELATIVE alert with positive offset persists it', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ triggerType: 'RELATIVE', offsetSeconds: 300 }) as never)
    await service.create('org_kingston_1', { eventId: 'event_1', userId: 'user_1', triggerType: 'RELATIVE', offsetSeconds: 300, createdBy: 'user_1' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ offsetSeconds: 300 }))
  })

  it('create for event persists eventId and null taskId', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ taskId: null, eventId: 'event_mandeville_1' }) as never)
    await service.create('org_kingston_1', { eventId: 'event_mandeville_1', userId: 'user_1', triggerType: 'RELATIVE', offsetSeconds: -600, createdBy: 'user_1' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event_mandeville_1', taskId: null }))
  })

  it('create returns tenant-not-found and never creates when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', { taskId: 'task_1', userId: 'user_1', triggerType: 'ABSOLUTE', triggerAt: 1_788_000_000, createdBy: 'user_1' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('retrieve returns alert when found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'alert_found' }) as never)
    const result = await service.retrieve('org_kingston_1', 'alert_found')
    expect(result).toEqual(expect.objectContaining({ id: 'alert_found', object: 'alert' }))
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'alert_found')
  })

  it('retrieve returns null when not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.retrieve('org_kingston_1', 'missing')
    expect(result).toBeNull()
  })

  it('list returns alerts with hasMore false', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'alert_a' })] as never)
    const result = await service.list('org_kingston_1', {}) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(1)
    expect(result.hasMore).toBe(false)
  })

  it('list signals hasMore when over limit', async () => {
    const many = Array.from({ length: 3 }, (_, i) => row({ id: `alert_${i}` }))
    vi.mocked(repository.list).mockResolvedValue(many as never)
    const result = await service.list('org_kingston_1', { limit: 2 }) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('update transitions to SENT stamps sentAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'alert_1', status: 'SCHEDULED', sentAt: null }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'alert_1', status: 'SENT' }) as never)
    await service.update('org_kingston_1', 'alert_1', { status: 'SENT' })
    expect(repository.update).toHaveBeenCalledWith('alert_1', expect.objectContaining({ status: 'SENT', sentAt: expect.any(Date) }))
  })

  it('update transitions to DISMISSED stamps dismissedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'SCHEDULED', dismissedAt: null }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'DISMISSED' }) as never)
    await service.update('org_kingston_1', 'alert_1', { status: 'DISMISSED' })
    expect(repository.update).toHaveBeenCalledWith('alert_1', expect.objectContaining({ status: 'DISMISSED', dismissedAt: expect.any(Date) }))
  })

  it('update back to SCHEDULED clears sentAt and dismissedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ status: 'SENT', sentAt: new Date() }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'SCHEDULED' }) as never)
    await service.update('org_kingston_1', 'alert_1', { status: 'SCHEDULED' })
    expect(repository.update).toHaveBeenCalledWith('alert_1', expect.objectContaining({ status: 'SCHEDULED', sentAt: null, dismissedAt: null }))
  })

  it('update returns null when alert not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', { status: 'SENT' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes alert', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.remove).mockResolvedValue({ object: 'alert', id: 'alert_1', deleted: true } as never)
    const result = await service.remove('org_kingston_1', 'alert_1')
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('alert_1')
  })

  it('remove returns null when alert not found and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', 'missing')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('returns tenant-inactive and never lists when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.list('org_kingston_1', {})
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-inactive' }))
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('rejects an alert payload with no parent via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        userId: 'user_kingston_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 1_788_307_200,
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an alert payload with two parents via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        taskId: 'task_montego_1',
        eventId: 'event_kingston_1',
        userId: 'user_kingston_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 1_788_307_200,
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an ABSOLUTE alert carrying an offset instead of an instant via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        taskId: 'task_montego_1',
        userId: 'user_kingston_1',
        triggerType: 'ABSOLUTE',
        offsetSeconds: -900,
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an ABSOLUTE alert carrying both an instant and an offset via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        taskId: 'task_montego_1',
        userId: 'user_kingston_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 1_788_307_200,
        offsetSeconds: -900,
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects a RELATIVE alert carrying an instant instead of an offset via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        taskId: 'task_montego_1',
        userId: 'user_kingston_1',
        triggerType: 'RELATIVE',
        triggerAt: 1_788_307_200,
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('accepts a RELATIVE alert with a positive after-offset via the real schema', () => {
    const parsed = createWorkAlertInputSchema.parse({
      eventId: 'event_kingston_1',
      userId: 'user_kingston_1',
      triggerType: 'RELATIVE',
      offsetSeconds: 300,
      action: 'EMAIL',
      createdBy: 'user_kingston_1',
    })
    expect(parsed.offsetSeconds).toBe(300)
    expect(parsed.action).toBe('EMAIL')
  })

  it('rejects an alert payload with an unknown action via the real schema', () => {
    expect(() =>
      createWorkAlertInputSchema.parse({
        taskId: 'task_montego_1',
        userId: 'user_kingston_1',
        triggerType: 'RELATIVE',
        offsetSeconds: -900,
        action: 'SMS',
        createdBy: 'user_kingston_1',
      })
    ).toThrow()
  })

  it('rejects an empty alert update payload via the real schema', () => {
    expect(() => updateWorkAlertInputSchema.parse({})).toThrow()
  })

  it('serializes the alert with the object discriminator and Unix timestamps', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'alert_1' }) as never)
    const result = await service.retrieve('org_kingston_1', 'alert_1')
    expect(result).toEqual({
      object: 'alert',
      id: 'alert_1',
      organizationId: 'org_kingston_1',
      taskId: 'task_montego_1',
      eventId: null,
      userId: 'user_kingston_1',
      triggerType: 'ABSOLUTE',
      triggerAt: 1_788_249_600,
      offsetSeconds: null,
      action: 'NOTIFICATION',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'user_kingston_1',
      createdAt: 1_788_091_200,
      updatedAt: 1_788_091_200,
    })
  })

  it('create persists the SCHEDULED status and null sent/dismissed stamps', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_kingston_1', {
      taskId: 'task_montego_1',
      userId: 'user_kingston_1',
      triggerType: 'ABSOLUTE',
      triggerAt: 1_788_307_200,
      createdBy: 'user_kingston_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SCHEDULED', sentAt: null, dismissedAt: null })
    )
  })

  it('update to DISMISSED keeps an existing dismissedAt stamp', async () => {
    const dismissedAt = new Date('2026-08-29T12:00:00.000Z')
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'SCHEDULED', dismissedAt }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(row({ status: 'DISMISSED', dismissedAt }) as never)
    await service.update('org_kingston_1', 'alert_1', { status: 'DISMISSED' })
    expect(repository.update).toHaveBeenCalledWith(
      'alert_1',
      expect.objectContaining({ dismissedAt })
    )
  })

  it('update with an unknown status returns null when the alert is missing and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', { status: 'SENT' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove returns tenant-inactive and never removes when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.remove('org_kingston_1', 'alert_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })
})
