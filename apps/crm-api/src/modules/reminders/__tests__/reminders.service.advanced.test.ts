import { expectValue } from '../../../test/expect-value.js'
import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { context, repo } = vi.hoisted(() => ({
  context: { requireRequestContext: vi.fn() },
  repo: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../requests/index.js', () => context)
vi.mock('../reminders.repository.js', () => repo)

const service = await import('../reminders.service.js')

const tenantId = 'crm_tenant_1'
const requestId = 'crm_req_1'

function reminderRow(overrides: Record<string, unknown> = {}) {
  const at = new Date('2026-08-27T00:00:00.000Z')
  const remindAt = new Date('2026-09-01T10:00:00.000Z')
  return {
    id: 'crm_rem_1',
    tenantId,
    requestId,
    title: 'Follow up',
    note: null,
    remindAt,
    userId: 'usr_1',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  context.requireRequestContext.mockResolvedValue({ tenantId, requestId })
  repo.list.mockResolvedValue([])
  repo.retrieve.mockResolvedValue(reminderRow())
  repo.create.mockResolvedValue(reminderRow())
  repo.update.mockResolvedValue(reminderRow())
  repo.remove.mockResolvedValue({
    object: 'request_reminder',
    id: 'crm_rem_1',
    deleted: true,
  })
})

describe('reminders.service.advanced - list serialization', () => {
  it('serializes timestamps and maps object discriminator', async () => {
    const at = new Date('2026-08-26T12:00:00.000Z')
    const remindAt = new Date('2026-09-02T09:00:00.000Z')
    repo.list.mockResolvedValue([
      reminderRow({ createdAt: at, updatedAt: at, remindAt }),
    ])
    const [rem] = expectValue(await service.list('org_1', requestId))
    expect(rem.object).toBe('request_reminder')
    expect(rem.createdAt).toBe(Math.floor(at.getTime() / 1000))
    expect(rem.remindAt).toBe(Math.floor(remindAt.getTime() / 1000))
    expect(rem.sentAt).toBeNull()
  })

  it('propagates context errors', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/request-not-found',
    })
    expect(repo.list).not.toHaveBeenCalled()
  })

  it('returns empty list when no reminders', async () => {
    repo.list.mockResolvedValue([])
    expect(await service.list('org_1', requestId)).toEqual([])
  })

  it('serializes sentAt and dismissedAt when present', async () => {
    const sentAt = new Date('2026-09-03T10:00:00.000Z')
    const dismissedAt = new Date('2026-09-04T10:00:00.000Z')
    repo.list.mockResolvedValue([
      reminderRow({ sentAt, dismissedAt, status: 'SENT' as const }),
    ])
    const [rem] = expectValue(await service.list('org_1', requestId))
    expect(rem.sentAt).toBe(Math.floor(sentAt.getTime() / 1000))
    expect(rem.dismissedAt).toBe(Math.floor(dismissedAt.getTime() / 1000))
  })
})

describe('reminders.service.advanced - create timestamp conversion', () => {
  it('converts remindAt from unix seconds to Date on write', async () => {
    const seconds = Math.floor(Date.parse('2026-09-10T08:00:00.000Z') / 1000)
    await service.create('org_1', requestId, {
      title: 'T',
      remindAt: seconds,
      userId: 'usr_1',
      createdBy: 'usr_1',
    } as unknown as Parameters<typeof service.create>[2])
    const call = repo.create.mock.calls[0][0] as unknown as Record<string, unknown>
    expect(call.remindAt).toBeInstanceOf(Date)
    expect((call.remindAt as Date).toISOString()).toBe(
      '2026-09-10T08:00:00.000Z'
    )
  })

  it('preserves tenant and request binding', async () => {
    const seconds = Math.floor(Date.now() / 1000)
    await service.create('org_1', requestId, {
      title: 'X',
      remindAt: seconds,
      userId: 'usr_2',
      createdBy: 'usr_1',
    } as unknown as Parameters<typeof service.create>[2])
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, requestId, userId: 'usr_2' })
    )
  })

  it('does not write when context fails', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/tenant-not-found')
    )
    await expect(
      service.create('org_1', requestId, {
        title: 'X',
        remindAt: 1_700_000_000,
        userId: 'usr_1',
        createdBy: 'usr_1',
      } as unknown as Parameters<typeof service.create>[2])
    ).resolves.toMatchObject({ code: 'crm/tenant-not-found' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('serializes created reminder with unix timestamps', async () => {
    const at = new Date('2026-08-27T00:00:00.000Z')
    const remindAt = new Date('2026-09-01T10:00:00.000Z')
    repo.create.mockResolvedValue(
      reminderRow({ title: 'New', createdAt: at, remindAt })
    )
    const result = expectValue(
      await service.create('org_1', requestId, {
        title: 'New',
        remindAt: Math.floor(remindAt.getTime() / 1000),
        userId: 'usr_1',
        createdBy: 'usr_1',
      } as unknown as Parameters<typeof service.create>[2])
    )
    expect(result.title).toBe('New')
    expect(result.remindAt).toBe(Math.floor(remindAt.getTime() / 1000))
  })
})

describe('reminders.service.advanced - update', () => {
  it('returns null when reminder missing', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.update('org_1', requestId, 'missing', {
        title: 'x',
      } as unknown as Parameters<typeof service.update>[3])
    ).toBeNull()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('converts remindAt on update when provided', async () => {
    repo.retrieve.mockResolvedValue(reminderRow())
    const seconds = Math.floor(Date.parse('2026-09-05T12:00:00.000Z') / 1000)
    await service.update('org_1', requestId, 'crm_rem_1', {
      remindAt: seconds,
    } as unknown as Parameters<typeof service.update>[3])
    const call = repo.update.mock.calls[0][1] as unknown as Record<string, unknown>
    expect(call.remindAt).toBeInstanceOf(Date)
    expect((call.remindAt as Date).toISOString()).toBe(
      '2026-09-05T12:00:00.000Z'
    )
  })

  it('leaves remindAt untouched when not in payload', async () => {
    repo.retrieve.mockResolvedValue(reminderRow())
    await service.update('org_1', requestId, 'crm_rem_1', {
      title: 'x',
    } as unknown as Parameters<typeof service.update>[3])
    expect(
      (repo.update.mock.calls[0][1] as unknown as Record<string, unknown>).remindAt
    ).toBeUndefined()
  })

  it('allows status transitions', async () => {
    repo.retrieve.mockResolvedValue(
      reminderRow({ status: 'SCHEDULED' as const })
    )
    await service.update('org_1', requestId, 'crm_rem_1', {
      status: 'DISMISSED',
    } as unknown as Parameters<typeof service.update>[3])
    expect(repo.update).toHaveBeenCalledWith(
      'crm_rem_1',
      expect.objectContaining({ status: 'DISMISSED' })
    )
  })

  it('propagates context errors', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(
      service.update('org_1', requestId, 'crm_rem_1', {
        title: 'x',
      } as unknown as Parameters<typeof service.update>[3])
    ).resolves.toMatchObject({ code: 'crm/request-not-found' })
  })
})

describe('reminders.service.advanced - remove', () => {
  it('returns null when not found', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.remove('org_1', requestId, 'missing', 'usr_1')
    ).toBeNull()
    expect(repo.remove).not.toHaveBeenCalled()
  })

  it('returns tombstone and calls repo.remove with deletedBy', async () => {
    repo.retrieve.mockResolvedValue(reminderRow())
    const res = expectValue(
      await service.remove('org_1', requestId, 'crm_rem_1', 'usr_1')
    )
    expect(res).toEqual({
      object: 'request_reminder',
      id: 'crm_rem_1',
      deleted: true,
    })
    expect(repo.remove).toHaveBeenCalledWith('crm_rem_1', 'usr_1')
  })

  it('propagates request-not-found', async () => {
    context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(
      service.remove('org_1', requestId, 'crm_rem_1', 'usr_1')
    ).resolves.toMatchObject({ code: 'crm/request-not-found' })
  })

  it('serializes remove does not leak internal fields', async () => {
    repo.retrieve.mockResolvedValue(reminderRow())
    const res = expectValue(
      await service.remove('org_1', requestId, 'crm_rem_1', 'usr_1')
    )
    expect(res).not.toHaveProperty('tenantId')
    expect(res).not.toHaveProperty('remindAt')
  })
})
