import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: { requireRequestContext: vi.fn() },
  priorities: {
    requireActiveForTenant: vi.fn(),
    retrieveDefaultForTenant: vi.fn(),
    retrieveForTenant: vi.fn(),
    serialize: vi.fn((value: unknown) => value),
  },
  tasks: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../requests/index.js', () => mocks.context)
vi.mock('../../priorities/index.js', () => mocks.priorities)
vi.mock('../../../providers/work.js', () => ({
  crmRequestWorkContext: (requestId: string) => ({
    service: 'crm',
    resource: 'request',
    id: requestId,
  }),
  workClient: () => ({ tasks: mocks.tasks }),
}))

const service = await import('../tasks.service.js')

const tenantId = 'crm_tnt_1'
const requestId = 'crm_req_1'
const priority = {
  object: 'request_priority' as const,
  id: 'crm_pri_1',
  tenantId,
  provisioningKey: null,
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: null,
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: 'usr_1',
  createdAt: 1,
  updatedAt: 1,
}

function workTask(overrides: Record<string, unknown> = {}) {
  return {
    object: 'task' as const,
    id: 'crm_task_1',
    organizationId: 'org_1',
    context: { service: 'crm', resource: 'request', id: requestId },
    title: 'Follow up',
    description: null,
    status: 'OPEN' as const,
    priorityId: priority.id,
    assigneeId: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
    createdBy: 'usr_1',
    createdAt: 1_800_000_000,
    updatedAt: 1_800_000_001,
    ...overrides,
  }
}

function listResult(data = [workTask()]) {
  return {
    data: {
      object: 'list' as const,
      data,
      has_more: false,
      total_count: data.length,
      url: '/v1/organizations/org_1/tasks',
    },
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.context.requireRequestContext.mockResolvedValue({ tenantId, requestId })
  mocks.priorities.requireActiveForTenant.mockResolvedValue(priority)
  mocks.priorities.retrieveDefaultForTenant.mockResolvedValue(priority)
  mocks.priorities.retrieveForTenant.mockResolvedValue(priority)
  mocks.priorities.serialize.mockImplementation((value) => value)
  mocks.tasks.list.mockResolvedValue(listResult())
  mocks.tasks.create.mockResolvedValue({ data: workTask(), error: null })
  mocks.tasks.update.mockResolvedValue({ data: workTask(), error: null })
  mocks.tasks.delete.mockResolvedValue({
    data: { object: 'task', id: 'crm_task_1', deleted: true },
    error: null,
  })
})

describe('CRM task adapter over Work', () => {
  it('lists only the request context and restores the CRM task shape', async () => {
    const result = await service.list('org_1', requestId)
    expect(mocks.tasks.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: requestId },
    })
    expect(result).toEqual([
      expect.objectContaining({
        object: 'request_task',
        id: 'crm_task_1',
        tenantId,
        requestId,
        priority,
        createdAt: 1_800_000_000,
      }),
    ])
  })

  it('creates a canonical Work task with opaque CRM request context', async () => {
    await service.create('org_1', requestId, {
      title: 'Follow up',
      createdBy: 'usr_1',
    })
    expect(mocks.tasks.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        context: { service: 'crm', resource: 'request', id: requestId },
        priorityId: priority.id,
        title: 'Follow up',
      })
    )
  })

  it('validates a changed CRM priority before sending it to Work', async () => {
    await service.update('org_1', requestId, 'crm_task_1', {
      priorityId: 'crm_pri_2',
    })
    expect(mocks.priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenantId,
      'crm_pri_2'
    )
  })

  it('will not update a task outside the request context', async () => {
    mocks.tasks.list.mockResolvedValue(listResult([]))
    await expect(
      service.update('org_1', requestId, 'other_task', { title: 'No' })
    ).resolves.toBeNull()
    expect(mocks.tasks.update).not.toHaveBeenCalled()
  })

  it('maps Work failures to the CRM public error catalog', async () => {
    mocks.tasks.list.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/work-unavailable',
    })
  })

  it('preserves the CRM deletion response while deleting in Work', async () => {
    await expect(
      service.remove('org_1', requestId, 'crm_task_1', 'usr_1')
    ).resolves.toEqual({
      object: 'request_task',
      id: 'crm_task_1',
      deleted: true,
    })
    expect(mocks.tasks.delete).toHaveBeenCalledWith(
      'org_1',
      'crm_task_1',
      'usr_1'
    )
  })

  it('propagates request-context failures without calling Work', async () => {
    mocks.context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/request-not-found',
    })
    expect(mocks.tasks.list).not.toHaveBeenCalled()
  })
})
