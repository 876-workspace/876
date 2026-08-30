vi.hoisted(() => {
  process.env.WORK_DATABASE_URL = 'postgres://localhost/test'
})
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as tasksService from './tasks.service.js'
import * as repository from './tasks.repository.js'
import * as tenants from '../tenants/index.js'
import type { WorkTask, WorkTaskStatus } from '@876/work'

vi.mock('./tasks.repository.js')
vi.mock('../tenants/index.js')
vi.mock('../../db/index.js')

type TaskRow = Awaited<ReturnType<typeof repository.retrieve>>
type Tenant = Awaited<ReturnType<typeof tenants.retrieveByOrganization>>

/** Narrows a service result to the task, failing the test on an error value. */
function expectTask(result: Awaited<ReturnType<typeof tasksService.retrieve>>) {
  expect(result).not.toBeNull()
  expect(result).toHaveProperty('object', 'task')
  return result as WorkTask
}

describe('Tasks Service - Edge Cases', () => {
  const FAKE_TIME = new Date('2026-01-01T12:00:00.000Z')
  const ORG_ID = 'org_123'
  const TENANT_ID = 'tenant_123'
  const TASK_ID = 'task_123'

  function createMockTenant(
    overrides: Partial<NonNullable<Tenant>> = {}
  ): NonNullable<Tenant> {
    return {
      object: 'work_tenant' as const,
      id: TENANT_ID,
      organizationId: ORG_ID,
      status: 'ACTIVE' as const,
      createdAt: 1000,
      updatedAt: 1000,
      ...overrides,
    }
  }

  function createMockTaskRow(
    overrides: Partial<NonNullable<TaskRow>> = {}
  ): NonNullable<TaskRow> {
    return {
      id: TASK_ID,
      uid: 'task_4f0c6bc866ae4fba8b1e8d3dca6c4d12@work.876',
      tenantId: TENANT_ID,
      listId: 'tasklist_4f0c6bc866ae4fba8b1e8d3dca6c4d12',
      parentTaskId: null,
      contextService: null,
      contextResource: null,
      contextId: null,
      title: 'Confirm the delivery window with Alejandra',
      description: null,
      status: 'OPEN' as WorkTaskStatus,
      importance: 'NORMAL',
      priorityId: null,
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
      createdBy: 'user_2kL9mN4q',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      links: [],
      assignments: [],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(
      createMockTenant()
    )
    vi.mocked(repository.retrieve).mockResolvedValue(createMockTaskRow())
    vi.mocked(repository.update).mockResolvedValue(createMockTaskRow())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Completion stamping state machine', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(FAKE_TIME)
    })

    it('OPEN -> IN_PROGRESS: completedAt stays null', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({ status: 'OPEN', completedAt: null })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'IN_PROGRESS' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'IN_PROGRESS',
      })
    })

    it('OPEN -> DONE: completedAt stamped, completedBy set', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({ status: 'OPEN', completedAt: null })
      )
      await tasksService.update(ORG_ID, TASK_ID, {
        status: 'DONE',
        completedBy: 'user_2',
      })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'DONE',
        completedBy: 'user_2',
        completedAt: FAKE_TIME,
        percentComplete: 100,
      })
    })

    it('IN_PROGRESS -> DONE: completedAt stamped', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({ status: 'IN_PROGRESS', completedAt: null })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'DONE' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'DONE',
        completedAt: FAKE_TIME,
        completedBy: null, // explicit check for completedBy: null
        percentComplete: 100,
      })
    })

    it('DONE -> DONE: completedAt NOT re-stamped (idempotent)', async () => {
      const pastDate = new Date('2025-01-01T00:00:00.000Z')
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({
          status: 'DONE',
          completedAt: pastDate,
          completedBy: 'user_1',
        })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'DONE' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'DONE',
        percentComplete: 100,
      })
      // Notice `completedAt` and `completedBy` are NOT in the payload
    })

    it('DONE -> OPEN: completedAt and completedBy both cleared', async () => {
      const pastDate = new Date('2025-01-01T00:00:00.000Z')
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({
          status: 'DONE',
          completedAt: pastDate,
          completedBy: 'user_1',
        })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'OPEN' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'OPEN',
        completedAt: null,
        completedBy: null,
      })
    })

    it('DONE -> CANCELLED: completedAt and completedBy both cleared', async () => {
      const pastDate = new Date('2025-01-01T00:00:00.000Z')
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({
          status: 'DONE',
          completedAt: pastDate,
          completedBy: 'user_1',
        })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'CANCELLED' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'CANCELLED',
        completedAt: null,
        completedBy: null,
      })
    })

    it('DONE -> (no status): completedAt untouched', async () => {
      const pastDate = new Date('2025-01-01T00:00:00.000Z')
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({
          status: 'DONE',
          completedAt: pastDate,
          completedBy: 'user_1',
        })
      )
      await tasksService.update(ORG_ID, TASK_ID, { title: 'New title' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        title: 'New title',
      })
    })

    it('CANCELLED -> DONE: completedAt stamped', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({ status: 'CANCELLED', completedAt: null })
      )
      await tasksService.update(ORG_ID, TASK_ID, { status: 'DONE' })
      expect(repository.update).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(TASK_ID, {
        status: 'DONE',
        completedAt: FAKE_TIME,
        completedBy: null,
        percentComplete: 100,
      })
    })
  })

  describe('Tenant Guards', () => {
    it('returns tenant-not-found when tenant does not exist and never calls repository', async () => {
      vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
      const result = await tasksService.update(ORG_ID, TASK_ID, {
        status: 'OPEN',
      })
      expect(result).toEqual({
        code: 'work/tenant-not-found',
        message: expect.any(String),
        httpStatus: 404,
      })
      expect(repository.retrieve).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('returns tenant-inactive when tenant is SUSPENDED and never calls repository', async () => {
      vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(
        createMockTenant({ status: 'SUSPENDED' })
      )
      const result = await tasksService.update(ORG_ID, TASK_ID, {
        status: 'OPEN',
      })
      expect(result).toEqual({
        code: 'work/tenant-inactive',
        message: expect.any(String),
        httpStatus: 409,
      })
      expect(repository.retrieve).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('Soft-delete edge case', () => {
    it('returns null on update to a soft-deleted task (not found)', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(null)
      const result = await tasksService.update(ORG_ID, TASK_ID, {
        status: 'OPEN',
      })
      expect(result).toBeNull()
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('Serialization edge cases', () => {
    it('serializes a half-built context as null rather than a partial object', async () => {
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({
          contextService: 'couriers',
          contextResource: null,
          contextId: 'pkg_8412',
        })
      )

      const task = expectTask(await tasksService.retrieve(ORG_ID, TASK_ID))

      expect(task.context).toBeNull()
    })

    it('floors a sub-second timestamp to the second it falls in', async () => {
      vi.mocked(repository.retrieve).mockResolvedValueOnce(
        createMockTaskRow({ createdAt: new Date('2026-01-01T12:00:00.999Z') })
      )
      const late = expectTask(await tasksService.retrieve(ORG_ID, TASK_ID))

      vi.mocked(repository.retrieve).mockResolvedValueOnce(
        createMockTaskRow({ createdAt: new Date('2026-01-01T12:00:00.000Z') })
      )
      const early = expectTask(await tasksService.retrieve(ORG_ID, TASK_ID))

      expect(late.createdAt).toBe(early.createdAt)
      expect(late.createdAt).toBe(1767268800)
    })

    it('floors a pre-epoch timestamp downwards, not towards zero', async () => {
      // 500ms before the epoch is -0.5s. Math.floor gives -1, Math.trunc gives 0;
      // only the former keeps the ordering of two adjacent instants correct.
      vi.mocked(repository.retrieve).mockResolvedValue(
        createMockTaskRow({ updatedAt: new Date(-500) })
      )

      const task = expectTask(await tasksService.retrieve(ORG_ID, TASK_ID))

      expect(task.updatedAt).toBe(-1)
    })
  })
})
