import { beforeEach, describe, expect, it, vi } from 'vitest'

const taskListRepository = vi.hoisted(() => ({
  ensureDefault: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./tasks.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  syncPrimaryLink: vi.fn(),
  syncPrimaryAssignee: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../task-lists/index.js', () => taskListRepository)

import * as tenants from '../tenants/index.js'
import * as repository from './tasks.repository.js'
import * as taskLists from '../task-lists/index.js'
import * as service from './tasks.service.js'

type TaskRow = Awaited<ReturnType<typeof repository.retrieve>>

const tenant = {
  object: 'work_tenant' as const,
  id: 'work_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
}

const taskList = {
  object: 'task_list' as const,
  id: 'tasklist_1',
  organizationId: tenant.organizationId,
  name: 'Inbox',
  description: null,
  ownerUserId: null,
  isDefault: true,
  sortOrder: 0,
  createdBy: 'user_1',
  createdAt: 1,
  updatedAt: 1,
}

function row(
  overrides: Partial<NonNullable<TaskRow>> = {}
): NonNullable<TaskRow> {
  return {
    id: 'task_1',
    uid: 'task_4f0c6bc866ae4fba8b1e8d3dca6c4d12@work.876',
    tenantId: tenant.id,
    listId: 'tasklist_1',
    parentTaskId: null,
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'req_1',
    title: 'Follow up',
    description: null,
    status: 'OPEN' as const,
    importance: 'NORMAL' as const,
    priorityId: 'crm_pri_1',
    assigneeId: null,
    startAt: null,
    startTimeZone: null,
    dueAt: null,
    dueTimeZone: null,
    estimatedDuration: null,
    percentComplete: 0,
    recurrenceRuleId: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    deletedAt: null,
    deletedBy: null,
    links: [],
    assignments: [],
    ...overrides,
  }
}

describe('Work tasks service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant)
    vi.mocked(taskLists.ensureDefault).mockResolvedValue(taskList)
    vi.mocked(taskLists.retrieve).mockResolvedValue(taskList)
    vi.mocked(repository.retrieve).mockResolvedValue(row())
    vi.mocked(repository.update).mockResolvedValue(row())
  })

  it('returns workspace missing as a value', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.list('org_1')
    expect(result).toMatchObject({ code: 'work/tenant-not-found' })
  })

  it('stores CRM request context as opaque values', async () => {
    vi.mocked(repository.create).mockResolvedValue(row())
    await service.create('org_1', {
      title: 'Follow up',
      priorityId: 'crm_pri_1',
      createdBy: 'user_1',
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
        priorityId: 'crm_pri_1',
      }),
      {}
    )
  })

  it('creates the legacy context and metadata-rich primary link atomically', async () => {
    const linkedRow = row({
      contextService: 'billing',
      contextResource: 'invoice',
      contextId: 'inv_1',
      links: [
        {
          id: 'tasklink_1',
          taskId: 'task_1',
          service: 'billing',
          resource: 'invoice',
          externalId: 'inv_1',
          label: 'INV-001',
          url: '/invoices/inv_1',
          isPrimary: true,
          createdAt: new Date(1000),
        },
      ],
    })
    vi.mocked(repository.create).mockResolvedValue(linkedRow)

    const result = await service.create('org_1', {
      title: 'Follow up',
      createdBy: 'user_1',
      primaryLink: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_1',
        label: 'INV-001',
        url: '/invoices/inv_1',
        isPrimary: true,
      },
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'billing',
        contextResource: 'invoice',
        contextId: 'inv_1',
      }),
      {
        primaryLink: {
          service: 'billing',
          resource: 'invoice',
          externalId: 'inv_1',
          label: 'INV-001',
          url: '/invoices/inv_1',
          isPrimary: true,
        },
      }
    )
    expect(result).toMatchObject({
      context: { service: 'billing', resource: 'invoice', id: 'inv_1' },
      links: [
        {
          service: 'billing',
          resource: 'invoice',
          externalId: 'inv_1',
          label: 'INV-001',
          url: '/invoices/inv_1',
          isPrimary: true,
        },
      ],
    })
    expect(repository.syncPrimaryLink).not.toHaveBeenCalled()
  })

  it('allows general tasks with no source context', async () => {
    const generalTask = row({
      contextService: null,
      contextResource: null,
      contextId: null,
    })
    vi.mocked(repository.create).mockResolvedValue(generalTask)
    vi.mocked(repository.retrieve).mockResolvedValue(generalTask)
    const result = await service.create('org_1', {
      title: 'Prepare rota',
      createdBy: 'user_1',
    })
    expect('code' in result).toBe(false)
    if (!('code' in result)) expect(result.context).toBeNull()
  })

  it('owns completion stamping after the extraction from CRM', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ completedAt: null, completedBy: null })
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ status: 'DONE', completedAt: new Date(), completedBy: 'user_2' })
    )
    await service.update('org_1', 'task_1', {
      status: 'DONE',
      completedBy: 'user_2',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'task_1',
      expect.objectContaining({
        completedAt: expect.any(Date),
        completedBy: 'user_2',
        status: 'DONE',
      })
    )
  })

  it('clears the completion stamp when reopened', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ status: 'DONE', completedAt: new Date(), completedBy: 'user_1' })
    )
    await service.update('org_1', 'task_1', { status: 'OPEN' })
    expect(repository.update).toHaveBeenCalledWith(
      'task_1',
      expect.objectContaining({
        completedAt: null,
        completedBy: null,
        status: 'OPEN',
      })
    )
  })
})
