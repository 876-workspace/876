import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { requireRequestContext, priorities, repository } = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  priorities: { requireActiveForTenant: vi.fn(), retrieveDefaultForTenant: vi.fn(), serialize: vi.fn(x => x) },
  repository: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('../requests/index.js', () => ({ requireRequestContext }))
vi.mock('../priorities/index.js', () => priorities)
vi.mock('./tasks.repository.js', () => repository)

const service = await import('./tasks.service.js')

const ctx = { tenantId: 't1', requestId: 'req_1' }
const taskRow = { id: 'task_1', tenantId: 't1', requestId: 'req_1', title: 'Do', description: null, status: 'OPEN' as const, priorityId: 'pri_1', priority: { id: 'pri_1', name: 'Normal' }, assigneeId: null, dueAt: null, completedAt: null, completedBy: null, sortOrder: 0, createdBy: 'u1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') }

beforeEach(() => {
  vi.clearAllMocks()
  requireRequestContext.mockResolvedValue(ctx as unknown as ReturnType<typeof requireRequestContext>)
  repository.list.mockResolvedValue([taskRow] as unknown as ReturnType<typeof repository.list>)
  repository.create.mockResolvedValue(taskRow as unknown as ReturnType<typeof repository.create>)
  priorities.requireActiveForTenant.mockResolvedValue({ id: 'pri_1' } as unknown as ReturnType<typeof priorities.requireActiveForTenant>)
  priorities.retrieveDefaultForTenant.mockResolvedValue({ id: 'pri_default' } as unknown as ReturnType<typeof priorities.retrieveDefaultForTenant>)
})

describe('tasks.service - value propagation advanced', () => {
  it('create propagates context error', async () => {
    const err = { code: 'crm/request-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.create('org_1', 'req_1', { title: 'T', createdBy: 'u1' } as Parameters<typeof service.create>[2])
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/request-not-found' })
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create propagates priority-not-found via resolvePriority', async () => {
    priorities.requireActiveForTenant.mockResolvedValue({ code: 'crm/priority-not-found', message: 'x', httpStatus: 404 } as unknown as ReturnType<typeof priorities.requireActiveForTenant>)
    const res = await service.create('org_1', 'req_1', { title: 'T', createdBy: 'u1', priorityId: 'bad' } as Parameters<typeof service.create>[2])
    expect(res).toMatchObject({ code: 'crm/priority-not-found' })
  })

  it('list propagates context tenant-inactive', async () => {
    const err = { code: 'crm/tenant-inactive', message: 'x', httpStatus: 409 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.list('org_1', 'req_1')
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })

  it('list success returns serialized tasks', async () => {
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
