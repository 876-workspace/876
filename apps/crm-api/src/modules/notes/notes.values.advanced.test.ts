import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { requireRequestContext, repository } = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  repository: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('../requests/index.js', () => ({ requireRequestContext }))
vi.mock('./notes.repository.js', () => repository)

const service = await import('./notes.service.js')

const ctx = { tenantId: 't1', requestId: 'req_1' }
const noteRow = { id: 'n1', tenantId: 't1', requestId: 'req_1', body: 'hello', authorId: 'u1', internal: false, privateToUserId: null, kind: 'NOTE' as const, editedAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') }

beforeEach(() => {
  vi.clearAllMocks()
  requireRequestContext.mockResolvedValue(ctx as unknown as ReturnType<typeof requireRequestContext>)
  repository.list.mockResolvedValue([noteRow] as unknown as ReturnType<typeof repository.list>)
  repository.create.mockResolvedValue(noteRow as unknown as ReturnType<typeof repository.create>)
  repository.retrieve.mockResolvedValue(noteRow as unknown as ReturnType<typeof repository.retrieve>)
  repository.update.mockResolvedValue(noteRow as unknown as ReturnType<typeof repository.update>)
})

describe('notes.service - context value propagation', () => {
  it('list propagates tenant-not-found via context', async () => {
    const err = { code: 'crm/tenant-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.list('org_1', 'req_1')
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('create propagates request-not-found via context', async () => {
    const err = { code: 'crm/request-not-found', message: 'x', httpStatus: 404 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.create('org_1', 'req_1', { body: 'hi', authorId: 'u1', kind: 'NOTE' } as Parameters<typeof service.create>[2])
    expect(res).toMatchObject({ code: 'crm/request-not-found' })
  })

  it('list returns serialized notes on success', async () => {
    const res = await service.list('org_1', 'req_1')
    expect(Array.isArray(res)).toBe(true)
    expect((res as unknown as Array<Record<string, unknown>>)[0].object).toBe('request_note')
  })

  it('update returns null when note missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.update('org_1', 'req_1', 'missing', { body: 'new', editedBy: 'u1' } as Parameters<typeof service.update>[3])
    expect(res).toBeNull()
  })

  it('error values are plain', async () => {
    const err = { code: 'crm/tenant-inactive', message: 'x', httpStatus: 409 }
    requireRequestContext.mockResolvedValue(err as unknown as ReturnType<typeof requireRequestContext>)
    const res = await service.list('org_1', 'req_1')
    expect(res).not.toBeInstanceOf(Error)
  })
})
