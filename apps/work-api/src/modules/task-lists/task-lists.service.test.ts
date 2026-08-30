import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkTaskListInputSchema,
  updateWorkTaskListInputSchema,
} from '@876/work'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./task-lists.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  ensureDefault: vi.fn(),
  retrieveDefault: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './task-lists.repository.js'
import * as service from './task-lists.service.js'

const tenant = {
  id: 'work_tnt_1',
  organizationId: 'org_kingston_1',
  status: 'ACTIVE' as const,
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tasklist_montego_1',
    tenantId: tenant.id,
    name: 'Inbox',
    description: 'Default organization task list.',
    ownerUserId: null,
    isDefault: false,
    sortOrder: 0,
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
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work task-lists service', () => {
  it('ensureDefault returns existing default without creating a second one', async () => {
    const existing = row({ isDefault: true, id: 'tasklist_default_1' })
    vi.mocked(repository.ensureDefault).mockResolvedValue(existing as never)
    const result = await service.ensureDefault('org_kingston_1', 'user_kingston_1')
    expect(result).toEqual(expect.objectContaining({ id: 'tasklist_default_1', isDefault: true }))
    expect(repository.ensureDefault).toHaveBeenCalledTimes(1)
    expect(repository.ensureDefault).toHaveBeenCalledWith(tenant.id, 'user_kingston_1')
  })

  it('ensureDefault creates default when none exists', async () => {
    const created = row({ isDefault: true, id: 'tasklist_default_new' })
    vi.mocked(repository.ensureDefault).mockResolvedValue(created as never)
    const result = await service.ensureDefault('org_kingston_1', 'user_kingston_2')
    expect(result).toEqual(expect.objectContaining({ id: 'tasklist_default_new' }))
    expect(repository.ensureDefault).toHaveBeenCalledTimes(1)
  })

  it('ensureDefault returns tenant-not-found and never calls repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.ensureDefault('org_missing', 'user_1')
    expect(result).toEqual({ code: 'work/tenant-not-found', message: expect.any(String), httpStatus: 404 })
    expect(repository.ensureDefault).not.toHaveBeenCalled()
  })

  it('ensureDefault returns tenant-inactive and never calls repository when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.ensureDefault('org_kingston_1', 'user_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.ensureDefault).not.toHaveBeenCalled()
  })

  it('list returns paginated data with hasMore false when under limit', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ id: 'tasklist_a' }), row({ id: 'tasklist_b' })] as never)
    const result = await service.list('org_kingston_1', { limit: 25 }) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(false)
    expect(repository.list).toHaveBeenCalledTimes(1)
  })

  it('list signals hasMore when repository returns limit+1 rows', async () => {
    const many = Array.from({ length: 3 }, (_, i) => row({ id: `tasklist_${i}` }))
    vi.mocked(repository.list).mockResolvedValue(many as never)
    const result = await service.list('org_kingston_1', { limit: 2 }) as { data: unknown[]; hasMore: boolean }
    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('list filters by ownerUserId', async () => {
    vi.mocked(repository.list).mockResolvedValue([row({ ownerUserId: 'user_kingston_9' })] as never)
    await service.list('org_kingston_1', { ownerUserId: 'user_kingston_9' })
    expect(repository.list).toHaveBeenCalledWith(tenant.id, expect.objectContaining({ ownerUserId: 'user_kingston_9' }))
  })

  it('retrieve returns serialized list when found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_found' }) as never)
    const result = await service.retrieve('org_kingston_1', 'tasklist_found')
    expect(result).toEqual(expect.objectContaining({ id: 'tasklist_found', object: 'task_list' }))
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'tasklist_found')
  })

  it('retrieve returns null when not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.retrieve('org_kingston_1', 'missing')
    expect(result).toBeNull()
  })

  it('create persists with isDefault false and sortOrder default', async () => {
    const created = row({ id: 'tasklist_new', name: 'Sprint Board', isDefault: false, sortOrder: 0 })
    vi.mocked(repository.create).mockResolvedValue(created as never)
    const result = await service.create('org_kingston_1', { name: 'Sprint Board', createdBy: 'user_kingston_1' })
    expect(result).toEqual(expect.objectContaining({ name: 'Sprint Board', isDefault: false }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: tenant.id, isDefault: false, sortOrder: 0 }))
    expect(repository.create).toHaveBeenCalledTimes(1)
  })

  it('create with explicit sortOrder persists it', async () => {
    const created = row({ id: 'tasklist_sorted', sortOrder: 5 })
    vi.mocked(repository.create).mockResolvedValue(created as never)
    await service.create('org_kingston_1', { name: 'Backlog', sortOrder: 5, createdBy: 'user_kingston_1' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 5 }))
  })

  it('create returns tenant-not-found without calling repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.create('org_missing', { name: 'X', createdBy: 'user_1' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update renames a list', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_1', name: 'Old' }) as never)
    const updated = row({ id: 'tasklist_1', name: 'New Name' })
    vi.mocked(repository.update).mockResolvedValue(updated as never)
    const result = await service.update('org_kingston_1', 'tasklist_1', { name: 'New Name' })
    expect(result).toEqual(expect.objectContaining({ name: 'New Name' }))
    expect(repository.update).toHaveBeenCalledWith('tasklist_1', expect.objectContaining({ name: 'New Name' }))
  })

  it('update returns null when list not found and never calls update', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update('org_kingston_1', 'missing', { name: 'X' })
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('update with sortOrder only updates that field', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_1' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'tasklist_1', sortOrder: 9 }) as never)
    await service.update('org_kingston_1', 'tasklist_1', { sortOrder: 9 })
    expect(repository.update).toHaveBeenCalledWith('tasklist_1', { sortOrder: 9 })
  })

  it('remove deletes non-default list', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_1', isDefault: false }) as never)
    vi.mocked(repository.remove).mockResolvedValue({ object: 'task_list', id: 'tasklist_1', deleted: true } as never)
    const result = await service.remove('org_kingston_1', 'tasklist_1', 'user_1')
    expect(result).toEqual({ object: 'task_list', id: 'tasklist_1', deleted: true })
    expect(repository.remove).toHaveBeenCalledWith('tasklist_1', 'user_1')
  })

  it('remove rejects deleting the default list with invalid-request and never calls repository remove', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_default', isDefault: true }) as never)
    const result = await service.remove('org_kingston_1', 'tasklist_default', 'user_1')
    expect(result).toEqual({ code: 'work/invalid-request', message: expect.any(String), httpStatus: 422 })
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns null when list not found', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove('org_kingston_1', 'missing', 'user_1')
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('remove returns tenant-not-found without calling repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.remove('org_missing', 'tasklist_1', 'user_1')
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('serializes rows with object discriminator and Unix-second timestamps', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_2' }) as never)
    const result = await service.retrieve('org_kingston_1', 'tasklist_2')
    expect(result).toEqual({
      object: 'task_list',
      id: 'tasklist_2',
      organizationId: 'org_kingston_1',
      name: 'Inbox',
      description: 'Default organization task list.',
      ownerUserId: null,
      isDefault: false,
      sortOrder: 0,
      createdBy: 'user_kingston_1',
      createdAt: 1_788_091_200,
      updatedAt: 1_788_091_200,
    })
  })

  it('create accepts a task-list payload with optional fields', () => {
    const parsed = createWorkTaskListInputSchema.parse({
      name: 'Sprint Board',
      description: 'Active sprint',
      ownerUserId: 'user_kingston_2',
      sortOrder: 3,
      createdBy: 'user_kingston_1',
    })
    expect(parsed).toEqual({
      name: 'Sprint Board',
      description: 'Active sprint',
      ownerUserId: 'user_kingston_2',
      sortOrder: 3,
      createdBy: 'user_kingston_1',
    })
  })

  it('rejects a task-list create payload that carries unknown fields', () => {
    expect(() =>
      createWorkTaskListInputSchema.parse({
        name: 'Sprint Board',
        createdBy: 'user_kingston_1',
        isDefault: true,
      })
    ).toThrow()
  })

  it('rejects a task-list create payload with an empty name', () => {
    expect(() =>
      createWorkTaskListInputSchema.parse({ name: '', createdBy: 'user_1' })
    ).toThrow()
  })

  it('rejects an empty task-list update payload', () => {
    expect(() => updateWorkTaskListInputSchema.parse({})).toThrow()
  })

  it('list accepts an explicit owner filter', async () => {
    vi.mocked(repository.list).mockResolvedValue([] as never)
    const result = await service.list('org_kingston_1', { ownerUserId: 'user_kingston_9' })
    expect(result).toEqual({ data: [], hasMore: false })
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      ownerUserId: 'user_kingston_9',
      limit: 25,
    })
  })

  it('list passes through a cursor and keeps the limit from the filter', async () => {
    vi.mocked(repository.list).mockResolvedValue([] as never)
    await service.list('org_kingston_1', {
      limit: 7,
      startingAfter: 'tasklist_anchor',
    })
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      limit: 7,
      startingAfter: 'tasklist_anchor',
    })
  })

  it('list reverses the page when endingBefore is used', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'tasklist_a', sortOrder: 0 }),
      row({ id: 'tasklist_b', sortOrder: 1 }),
    ] as never)
    const result = await service.list('org_kingston_1', {
      limit: 25,
      endingBefore: 'tasklist_b',
    }) as { data: Array<{ id: string }> }
    expect(result.data.map((r) => r.id)).toEqual(['tasklist_b', 'tasklist_a'])
  })

  it('update only touches the fields present in the input', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_1' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'tasklist_1', description: 'New description' }) as never)
    await service.update('org_kingston_1', 'tasklist_1', {
      description: 'New description',
    })
    expect(repository.update).toHaveBeenCalledWith('tasklist_1', {
      description: 'New description',
    })
  })

  it('update with a null description clears it', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row({ id: 'tasklist_1', description: 'Old' }) as never)
    vi.mocked(repository.update).mockResolvedValue(row({ id: 'tasklist_1', description: null }) as never)
    await service.update('org_kingston_1', 'tasklist_1', { description: null })
    expect(repository.update).toHaveBeenCalledWith('tasklist_1', {
      description: null,
    })
  })

  it('update returns tenant-not-found and never queries the repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.update('org_missing', 'tasklist_1', { name: 'X' })
    expect(result).toEqual(expect.objectContaining({ code: 'work/tenant-not-found' }))
    expect(repository.retrieve).not.toHaveBeenCalled()
  })

  it('remove returns tenant-inactive and never calls repository.remove when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.remove('org_kingston_1', 'tasklist_1', 'user_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('ensureDefault returns tenant-inactive and never calls the repository when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.ensureDefault('org_kingston_1', 'user_1')
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.ensureDefault).not.toHaveBeenCalled()
  })

  it('list returns tenant-inactive and never lists when tenant suspended', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue({ ...tenant, status: 'SUSPENDED' } as never)
    const result = await service.list('org_kingston_1', {})
    expect(result).toEqual({ code: 'work/tenant-inactive', message: expect.any(String), httpStatus: 409 })
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('retrieve returns tenant-not-found without querying the repository when tenant missing', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.retrieve('org_missing', 'tasklist_1')
    expect(result).toEqual({ code: 'work/tenant-not-found', message: expect.any(String), httpStatus: 404 })
    expect(repository.retrieve).not.toHaveBeenCalled()
  })

  it('create persists the ownerUserId when provided', async () => {
    vi.mocked(repository.create).mockResolvedValue(row({ ownerUserId: 'user_kingston_2' }) as never)
    await service.create('org_kingston_1', {
      name: 'Personal',
      ownerUserId: 'user_kingston_2',
      createdBy: 'user_kingston_1',
    })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'user_kingston_2' }))
  })
})
