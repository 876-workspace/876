import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CreateReminderInput,
  CreateTaskInput,
  UpdateReminderInput,
  UpdateTaskInput,
} from '../../../types/task.js'

const { tenants, base, tasksRepo } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  base: { retrieve: vi.fn() },
  tasksRepo: {
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    removeTask: vi.fn(),
    listReminders: vi.fn(),
    getReminder: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    removeReminder: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => base)
vi.mock('../requests.tasks.repository.js', () => tasksRepo)

const service = await import('../requests.tasks.service.js')
const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
}
const reqId = 'crm_req_1'

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  base.retrieve.mockResolvedValue({ id: reqId, tenantId: tenant.id })
  tasksRepo.listTasks.mockResolvedValue([])
  tasksRepo.listReminders.mockResolvedValue([])
  tasksRepo.getTask.mockResolvedValue(null)
  tasksRepo.getReminder.mockResolvedValue(null)
  tasksRepo.createTask.mockResolvedValue({
    id: 'crm_task_1',
    tenantId: tenant.id,
    requestId: reqId,
    title: 'T',
    status: 'OPEN',
    priority: 'NORMAL',
    assigneeId: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
    createdBy: 'usr_1',
    createdAt: new Date('2026-08-26T00:00:00Z'),
    updatedAt: new Date('2026-08-26T00:00:00Z'),
    deletedAt: null,
    description: null,
  })
  tasksRepo.createReminder.mockResolvedValue({
    id: 'crm_rem_1',
    tenantId: tenant.id,
    requestId: reqId,
    title: 'R',
    note: null,
    remindAt: new Date('2026-08-27T00:00:00Z'),
    userId: 'usr_2',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })
  tasksRepo.updateTask.mockResolvedValue({
    id: 'crm_task_1',
    tenantId: tenant.id,
    requestId: reqId,
    title: 'T',
    status: 'DONE',
    completedAt: new Date(),
    completedBy: 'usr_2',
    dueAt: null,
    priority: 'NORMAL',
    assigneeId: null,
    sortOrder: 0,
    createdBy: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    description: null,
  })
  tasksRepo.updateReminder.mockResolvedValue({
    id: 'crm_rem_1',
    tenantId: tenant.id,
    requestId: reqId,
    title: 'R',
    remindAt: new Date(),
    userId: 'usr_2',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    note: null,
  })
  tasksRepo.removeTask.mockResolvedValue({
    object: 'request_task',
    id: 'crm_task_1',
    deleted: true,
  })
  tasksRepo.removeReminder.mockResolvedValue({
    object: 'request_reminder',
    id: 'crm_rem_1',
    deleted: true,
  })
})

describe('requests.tasks.service - tenant and request guards', () => {
  it('throws tenant-not-found when org has no tenant', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    await expect(service.tasks('org_x', reqId)).rejects.toMatchObject({
      code: 'crm/tenant-not-found',
    })
  })
  it('throws tenant-inactive', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({
      ...tenant,
      status: 'INACTIVE',
    })
    await expect(service.tasks('org_1', reqId)).rejects.toMatchObject({
      code: 'crm/tenant-inactive',
    })
  })
  it('throws request-not-found when request missing', async () => {
    base.retrieve.mockResolvedValue(null)
    await expect(service.tasks('org_1', 'missing')).rejects.toMatchObject({
      code: 'crm/request-not-found',
    })
  })
  it('throws request-not-found on createTask when request missing', async () => {
    base.retrieve.mockResolvedValue(null)
    await expect(
      service.createTask('org_1', 'missing', {
        title: 'T',
        createdBy: 'usr_1',
      } as unknown as CreateTaskInput)
    ).rejects.toMatchObject({ code: 'crm/request-not-found' })
  })
})

describe('requests.tasks.service - tasks', () => {
  it('lists tasks and stamps dates to unix seconds', async () => {
    const now = new Date('2026-08-26T12:34:56.000Z')
    tasksRepo.listTasks.mockResolvedValue([
      {
        id: 'crm_task_1',
        tenantId: tenant.id,
        requestId: reqId,
        title: 'T',
        status: 'OPEN',
        priority: 'NORMAL',
        assigneeId: null,
        dueAt: now,
        completedAt: null,
        completedBy: null,
        sortOrder: 0,
        createdBy: 'usr_1',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        description: null,
      },
    ])
    const result = await service.tasks('org_1', reqId)
    expect(result[0]).toMatchObject({
      object: 'request_task',
      dueAt: Math.floor(now.getTime() / 1000),
      createdAt: Math.floor(now.getTime() / 1000),
    })
  })
  it('converts a dueAt in unix seconds to a millisecond Date', async () => {
    // The wire carries seconds in both directions, so the service multiplies by
    // 1000 on the way in. Passing milliseconds here would land the due date
    // ~55,000 years out and still "pass" a loose assertion.
    const dueSeconds = Math.floor(Date.parse('2026-09-01T09:00:00.000Z') / 1000)

    await service.createTask('org_1', reqId, {
      title: 'New',
      createdBy: 'usr_1',
      dueAt: dueSeconds,
    } as unknown as CreateTaskInput)

    expect(tasksRepo.createTask).toHaveBeenCalledTimes(1)
    const call = tasksRepo.createTask.mock.calls[0][0]
    expect(call.dueAt).toBeInstanceOf(Date)
    expect(call.dueAt.getTime()).toBe(dueSeconds * 1000)
    expect(call.dueAt.toISOString()).toBe('2026-09-01T09:00:00.000Z')
  })
  it('creates task without dueAt as null', async () => {
    await service.createTask('org_1', reqId, {
      title: 'New',
      createdBy: 'usr_1',
    } as unknown as CreateTaskInput)
    expect(tasksRepo.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ dueAt: null })
    )
  })
  it('returns null when updating missing task', async () => {
    tasksRepo.getTask.mockResolvedValue(null)
    expect(
      await service.updateTask('org_1', reqId, 'missing', {
        title: 'x',
      } as unknown as UpdateTaskInput)
    ).toBeNull()
  })
  it('stamps completedAt when moving to DONE', async () => {
    tasksRepo.getTask.mockResolvedValue({ id: 'crm_task_1', completedAt: null })
    await service.updateTask('org_1', reqId, 'crm_task_1', {
      status: 'DONE',
      completedBy: 'usr_2',
    } as unknown as UpdateTaskInput)
    expect(tasksRepo.updateTask).toHaveBeenCalledWith(
      'crm_task_1',
      expect.objectContaining({
        completedAt: expect.any(Date),
        completedBy: 'usr_2',
      })
    )
  })
  it('clears completedAt when moving away from DONE', async () => {
    tasksRepo.getTask.mockResolvedValue({
      id: 'crm_task_1',
      completedAt: new Date(),
    })
    await service.updateTask('org_1', reqId, 'crm_task_1', {
      status: 'OPEN',
    } as unknown as UpdateTaskInput)
    expect(tasksRepo.updateTask).toHaveBeenCalledWith(
      'crm_task_1',
      expect.objectContaining({ completedAt: null, completedBy: null })
    )
  })
  it('handles dueAt null to clear', async () => {
    tasksRepo.getTask.mockResolvedValue({ id: 'crm_task_1', completedAt: null })
    await service.updateTask('org_1', reqId, 'crm_task_1', {
      dueAt: null,
    } as unknown as UpdateTaskInput)
    expect(tasksRepo.updateTask).toHaveBeenCalledWith(
      'crm_task_1',
      expect.objectContaining({ dueAt: null })
    )
  })
  it('returns null when removing missing task', async () => {
    tasksRepo.getTask.mockResolvedValue(null)
    expect(
      await service.removeTask('org_1', reqId, 'missing', 'usr_1')
    ).toBeNull()
  })
  it('removes task when exists', async () => {
    tasksRepo.getTask.mockResolvedValue({ id: 'crm_task_1' })
    const result = await service.removeTask(
      'org_1',
      reqId,
      'crm_task_1',
      'usr_1'
    )
    expect(result).toEqual({
      object: 'request_task',
      id: 'crm_task_1',
      deleted: true,
    })
  })
})

describe('requests.tasks.service - reminders', () => {
  it('lists reminders with unix stamps', async () => {
    const now = new Date('2026-08-27T00:00:00Z')
    tasksRepo.listReminders.mockResolvedValue([
      {
        id: 'crm_rem_1',
        tenantId: tenant.id,
        requestId: reqId,
        title: 'R',
        remindAt: now,
        sentAt: null,
        dismissedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
    const res = await service.reminders('org_1', reqId)
    expect(res[0]).toMatchObject({
      object: 'request_reminder',
      remindAt: Math.floor(now.getTime() / 1000),
    })
  })
  it('creates reminder with remindAt Date', async () => {
    const at = Date.now()
    await service.createReminder('org_1', reqId, {
      title: 'R',
      remindAt: at,
      userId: 'usr_2',
      createdBy: 'usr_1',
    } as unknown as CreateReminderInput)
    expect(tasksRepo.createReminder).toHaveBeenCalledWith(
      expect.objectContaining({ remindAt: expect.any(Date) })
    )
  })
  it('returns null when updating missing reminder', async () => {
    tasksRepo.getReminder.mockResolvedValue(null)
    expect(
      await service.updateReminder('org_1', reqId, 'missing', {
        title: 'x',
      } as unknown as UpdateReminderInput)
    ).toBeNull()
  })
  it('updates reminder with remindAt conversion', async () => {
    tasksRepo.getReminder.mockResolvedValue({ id: 'crm_rem_1' })
    const at = Date.now()
    await service.updateReminder('org_1', reqId, 'crm_rem_1', {
      remindAt: at,
    } as unknown as UpdateReminderInput)
    expect(tasksRepo.updateReminder).toHaveBeenCalledWith(
      'crm_rem_1',
      expect.objectContaining({ remindAt: expect.any(Date) })
    )
  })
  it('returns null when removing missing reminder', async () => {
    tasksRepo.getReminder.mockResolvedValue(null)
    expect(
      await service.removeReminder('org_1', reqId, 'missing', 'usr_1')
    ).toBeNull()
  })
})
