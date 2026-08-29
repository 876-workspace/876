import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { requireRequestContext, repository } = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  repository: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('../requests/index.js', () => ({ requireRequestContext }))
vi.mock('./reminders.repository.js', () => repository)

const service = await import('./reminders.service.js')

const ctx = { tenantId: 't1', requestId: 'req_1' }
const reminderRow = { id: 'rem_1', tenantId: 't1', requestId: 'req_1', remindAt: new Date('2026-09-01'), createdBy: 'u1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') }

beforeEach(() => {
  vi.clearAllMocks()
  requireRequestContext.mockResolvedValue(ctx as unknown as ReturnType<typeof requireRequestContext>)
  repository.list.mockResolvedValue([reminderRow] as unknown as ReturnType<typeof repository.list>)
  repository.create.mockResolvedValue(reminderRow as unknown as ReturnType<typeof repository.create>)
  repository.retrieve.mockResolvedValue(reminderRow as unknown as ReturnType<typeof repository.retrieve>)
})

describe('reminders.service - value propagation advanced', () => {
  it('list propagates context error', async () => {
    const err = { code: 'crm/tenant-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.list('org_1', 'req_1')
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
  })

  it('create propagates request-not-found', async () => {
    const err = { code: 'crm/request-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.create('org_1', 'req_1', { remindAt: Math.floor(Date.now()/1000), createdBy: 'u1' } as Parameters<typeof service.create>[2])
    expect(res).toMatchObject({ code: 'crm/request-not-found' })
  })

  it('list success', async () => {
    const res = await service.list('org_1', 'req_1')
    expect(Array.isArray(res)).toBe(true)
  })

  it('error values are plain', async () => {
    const err = { code: 'crm/request-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.list('org_1', 'req_1')
    expect(res).not.toBeInstanceOf(Error)
  })
})
