import { getError } from '@876/core'
import type { WorkTask } from '@876/work'
import type { RequestPriority } from '../../../types/priority.js'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as tasksAdapter from '../tasks.service.js'
import { workClient, crmRequestWorkContext } from '../../../providers/work.js'
import * as priorities from '../../priorities/index.js'
import * as requests from '../../requests/index.js'

vi.hoisted(() => {
  process.env.CRM_DATABASE_URL = 'postgres://localhost/test'
})

vi.mock('../../../providers/work.js')
vi.mock('../../priorities/index.js')
vi.mock('../../requests/index.js')

describe('CRM Tasks - Work Adapter Edge Cases', () => {
  const ORG_ID = 'org_123'
  const TENANT_ID = 'tenant_123'
  const REQ_ID = 'req_123'
  const TASK_ID = 'task_123'

  const mockWorkTasks = {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  function createMockWorkTask(overrides: Partial<WorkTask> = {}): WorkTask {
    return {
      object: 'task',
      id: TASK_ID,
      uid: 'task_4f0c6bc866ae4fba8b1e8d3dca6c4d12@work.876',
      organizationId: ORG_ID,
      listId: 'tasklist_4f0c6bc866ae4fba8b1e8d3dca6c4d12',
      parentTaskId: null,
      context: { service: 'crm', resource: 'request', id: REQ_ID },
      links: [],
      title: 'Confirm the delivery window with Alejandra',
      description: null,
      status: 'OPEN' as const,
      importance: 'NORMAL',
      priorityId: 'crm_pri_high',
      assigneeId: null,
      assignments: [],
      startAt: null,
      startTimeZone: null,
      dueAt: null,
      dueTimeZone: null,
      estimatedDuration: null,
      percentComplete: 0,
      recurrenceRuleId: null,
      completedAt: null,
      completedBy: null,
      isOverdue: false,
      sortOrder: 0,
      createdBy: 'user_2kL9mN4q',
      createdAt: 1000,
      updatedAt: 1000,
      ...overrides,
    }
  }

  function createMockPriority(
    overrides: Partial<RequestPriority> = {}
  ): RequestPriority {
    return {
      object: 'request_priority',
      id: 'crm_pri_high',
      tenantId: TENANT_ID,
      provisioningKey: 'high',
      name: 'High',
      slug: 'high',
      description: null,
      color: '#dc2626',
      icon: null,
      weight: 200,
      sortOrder: 1,
      isDefault: false,
      isActive: true,
      createdBy: 'user_2kL9mN4q',
      createdAt: 1_767_225_600,
      updatedAt: 1_767_225_600,
      ...overrides,
    }
  }

  type PriorityRow = Exclude<
    Awaited<ReturnType<typeof priorities.requireActiveForTenant>>,
    { code: string }
  >

  /** requireActive/retrieveDefault return the repository row, not the serialized resource. */
  function createMockPriorityRow(
    overrides: Partial<PriorityRow> = {}
  ): PriorityRow {
    return {
      id: 'crm_pri_high',
      tenantId: TENANT_ID,
      provisioningKey: 'high',
      name: 'High',
      slug: 'high',
      description: null,
      color: '#dc2626',
      icon: null,
      weight: 200,
      sortOrder: 1,
      isDefault: false,
      isActive: true,
      createdBy: 'user_2kL9mN4q',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      ...overrides,
    } as PriorityRow
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(workClient).mockReturnValue({
      tasks: mockWorkTasks,
    } as unknown as ReturnType<typeof workClient>)
    vi.mocked(crmRequestWorkContext).mockImplementation((id) => ({
      service: 'crm',
      resource: 'request',
      id,
    }))
    vi.mocked(requests.requireRequestContext).mockResolvedValue({
      tenantId: TENANT_ID,
      requestId: REQ_ID,
    })
    vi.mocked(priorities.retrieveForTenant).mockResolvedValue(
      createMockPriority()
    )
    vi.mocked(priorities.requireActiveForTenant).mockResolvedValue(
      createMockPriorityRow()
    )
    vi.mocked(priorities.retrieveDefaultForTenant).mockResolvedValue(
      createMockPriorityRow()
    )
    vi.mocked(priorities.serialize).mockImplementation(
      (row) => row as unknown as RequestPriority
    )
  })

  describe('Request and Service isolation', () => {
    it('rejects update when context.id is a different request id', async () => {
      mockWorkTasks.retrieve.mockResolvedValue({
        data: createMockWorkTask({
          context: { service: 'crm', resource: 'request', id: 'other_req' },
        }),
        error: null,
      })

      const result = await tasksAdapter.update(ORG_ID, REQ_ID, TASK_ID, {
        title: 'New',
      })
      expect(result).toBeNull()
      expect(mockWorkTasks.update).not.toHaveBeenCalled()
    })

    it('rejects update when context.service is different', async () => {
      mockWorkTasks.retrieve.mockResolvedValue({
        data: createMockWorkTask({
          context: { service: 'couriers', resource: 'request', id: REQ_ID },
        }),
        error: null,
      })

      const result = await tasksAdapter.update(ORG_ID, REQ_ID, TASK_ID, {
        title: 'New',
      })
      expect(result).toBeNull()
      expect(mockWorkTasks.update).not.toHaveBeenCalled()
    })
  })

  describe('Work outage and malformed payload', () => {
    it('returns crm/work-unavailable with full error object on network failure (no data)', async () => {
      mockWorkTasks.create.mockResolvedValue({
        data: null,
        error: { code: 'network_error', message: 'timeout', httpStatus: 502 },
      })

      const result = await tasksAdapter.create(ORG_ID, REQ_ID, {
        title: 'New',
        createdBy: 'u',
      })
      expect(result).toEqual({
        code: 'crm/work-unavailable',
        message: expect.any(String),
        httpStatus: 502,
      })
    })

    it('handles malformed payload without crashing (validation happens in Zod inside workClient ideally)', async () => {
      mockWorkTasks.retrieve.mockResolvedValue({
        data: null,
        error: { code: 'work/validation-error', message: 'malformed data' },
      })
      const result = await tasksAdapter.update(ORG_ID, REQ_ID, TASK_ID, {
        title: 'New',
      })
      expect(result).toEqual({
        code: 'crm/work-unavailable',
        message: expect.any(String),
        httpStatus: 502,
      })
    })
  })

  describe('Work not-found mapping', () => {
    it('maps work/task-not-found to null (CRM answers 404)', async () => {
      mockWorkTasks.retrieve.mockResolvedValue({
        data: null,
        error: { code: 'work/task-not-found', message: 'not found' },
      })

      const result = await tasksAdapter.update(ORG_ID, REQ_ID, TASK_ID, {
        title: 'New',
      })
      expect(result).toBeNull()
    })
  })

  describe('Ordering of validation', () => {
    it('validates CRM request context before calling Work, never invoking Work if request unknown', async () => {
      vi.mocked(requests.requireRequestContext).mockResolvedValue(
        getError('crm/request-not-found')
      )

      const result = await tasksAdapter.update(ORG_ID, REQ_ID, TASK_ID, {
        title: 'New',
      })
      expect(result).toEqual(getError('crm/request-not-found'))
      expect(mockWorkTasks.retrieve).not.toHaveBeenCalled()
      expect(mockWorkTasks.update).not.toHaveBeenCalled()
    })
  })

  describe('Priority enrichment and payload', () => {
    it('returns crm/priority-not-found if CRM no longer recognizes the priorityId', async () => {
      mockWorkTasks.list.mockResolvedValue({
        data: {
          data: [createMockWorkTask({ priorityId: 'old_prio' })],
          has_more: false,
        },
        error: null,
      })
      // priorities module returns null meaning not found
      vi.mocked(priorities.retrieveForTenant).mockResolvedValue(null)

      const result = await tasksAdapter.list(ORG_ID, REQ_ID)
      expect(result).toEqual({
        code: 'crm/priority-not-found',
        message: expect.any(String),
        httpStatus: 404,
      })
    })

    it('never sends priority to Work as a relation; passes plain string priorityId', async () => {
      mockWorkTasks.create.mockResolvedValue({
        data: createMockWorkTask(),
        error: null,
      })

      await tasksAdapter.create(ORG_ID, REQ_ID, {
        title: 'New',
        priorityId: 'prio_2',
        createdBy: 'u',
      })

      expect(mockWorkTasks.create).toHaveBeenCalledTimes(1)
      expect(mockWorkTasks.create).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          title: 'New',
          priorityId: 'crm_pri_high', // resolved from requireActiveForTenant
          createdBy: 'u',
        })
      )
      // Assert it DOES NOT contain CRM priority object
      const callArgs = mockWorkTasks.create.mock.calls[0][1]
      expect(callArgs.priority).toBeUndefined()
    })
  })

  describe('CRM response contract', () => {
    it.each([
      ['OPEN', 'OPEN'],
      ['IN_PROGRESS', 'IN_PROGRESS'],
      ['WAITING', 'IN_PROGRESS'],
      ['DEFERRED', 'OPEN'],
      ['DONE', 'DONE'],
      ['CANCELLED', 'CANCELLED'],
      ['FAILED', 'CANCELLED'],
    ] as const)('maps Work %s status to CRM %s', async (workStatus, status) => {
      mockWorkTasks.list.mockResolvedValue({
        data: {
          data: [createMockWorkTask({ status: workStatus })],
          has_more: false,
        },
        error: null,
      })

      const result = await tasksAdapter.list(ORG_ID, REQ_ID)

      expect(result).toEqual([expect.objectContaining({ status })])
    })

    it('returns the full request_task shape field by field', async () => {
      mockWorkTasks.create.mockResolvedValue({
        data: createMockWorkTask(),
        error: null,
      })

      const priority = createMockPriority()
      vi.mocked(priorities.serialize).mockReturnValue(priority)

      const result = await tasksAdapter.create(ORG_ID, REQ_ID, {
        title: 'Confirm the delivery window with Alejandra',
        createdBy: 'user_2kL9mN4q',
      })
      expect(result).toEqual({
        object: 'request_task',
        id: TASK_ID,
        tenantId: TENANT_ID,
        requestId: REQ_ID,
        title: 'Confirm the delivery window with Alejandra',
        description: null,
        status: 'OPEN',
        priorityId: 'crm_pri_high',
        priority: priority,
        assigneeId: null,
        dueAt: null,
        completedAt: null,
        completedBy: null,
        sortOrder: 0,
        createdBy: 'user_2kL9mN4q',
        createdAt: 1000,
        updatedAt: 1000,
      })
    })
  })
})
