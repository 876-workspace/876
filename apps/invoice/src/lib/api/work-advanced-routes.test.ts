import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  requireAuthorizedInvoiceWorkContext: vi.fn(),
  getWork: vi.fn(),
  retrieveTask: vi.fn(),
  createAssignment: vi.fn(),
  listAssignments: vi.fn(),
  createAlert: vi.fn(),
  retrieveAlert: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/auth/work-widget-context', () => ({
  requireAuthorizedInvoiceWorkContext:
    mocks.requireAuthorizedInvoiceWorkContext,
}))
vi.mock('@/lib/clients/work', () => ({ getWork: mocks.getWork }))

import { handlePostWorkAlert } from './work-alerts-route'
import {
  handleGetTaskAssignments,
  handlePostTaskAssignment,
} from './work-task-assignments-route'

const AUTH = { response: null, orgId: 'org_1', userId: 'user_1' }
const CONTEXT = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv_1',
  label: 'INV-001',
  url: '/invoices/inv_1',
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireWorkWidgetPermission.mockResolvedValue(AUTH)
  mocks.requireAuthorizedInvoiceWorkContext.mockResolvedValue({
    context: CONTEXT,
    response: null,
  })
  mocks.getWork.mockResolvedValue({
    tasks: { retrieve: mocks.retrieveTask },
    taskAssignments: {
      create: mocks.createAssignment,
      list: mocks.listAssignments,
    },
    alerts: {
      create: mocks.createAlert,
      retrieve: mocks.retrieveAlert,
    },
  })
  mocks.retrieveTask.mockResolvedValue({
    data: {
      object: 'task',
      id: 'task_1',
      context: {
        service: 'billing',
        resource: 'invoice',
        id: 'inv_1',
      },
      links: [],
    },
    error: null,
  })
  mocks.createAssignment.mockResolvedValue({
    data: { object: 'task_assignment', id: 'assign_1' },
    error: null,
  })
  mocks.listAssignments.mockResolvedValue({
    data: { object: 'list', data: [], has_more: false },
    error: null,
  })
  mocks.createAlert.mockResolvedValue({
    data: { object: 'alert', id: 'alert_1' },
    error: null,
  })
})

describe('Invoice advanced Work BFF handlers', () => {
  it('injects assignment authority and initial lifecycle state', async () => {
    const response = await handlePostTaskAssignment(
      new Request('https://invoice.test/api/tasks/task_1/assignments', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'USER',
          assigneeId: 'user_2',
          role: 'REVIEWER',
        }),
      }),
      'task_1'
    )

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'tasks.assign'
    )
    expect(mocks.createAssignment).toHaveBeenCalledWith('org_1', 'task_1', {
      targetType: 'USER',
      assigneeId: 'user_2',
      role: 'REVIEWER',
      status: 'PENDING',
      assignedBy: 'user_1',
    })
    expect(response.status).toBe(201)
  })

  it('rejects contextual assignment access when the task is not on the invoice', async () => {
    mocks.retrieveTask.mockResolvedValue({
      data: {
        object: 'task',
        id: 'task_1',
        context: null,
        links: [],
      },
      error: null,
    })

    const response = await handleGetTaskAssignments('task_1', 'inv_1')

    expect(response.status).toBe(404)
    expect(mocks.listAssignments).not.toHaveBeenCalled()
  })

  it('injects the signed-in user into alert ownership fields', async () => {
    const response = await handlePostWorkAlert(
      new Request('https://invoice.test/api/tasks/task_1/alerts', {
        method: 'POST',
        body: JSON.stringify({
          triggerType: 'RELATIVE',
          offsetSeconds: -900,
          action: 'NOTIFICATION',
        }),
      }),
      { type: 'task', id: 'task_1' }
    )

    expect(mocks.createAlert).toHaveBeenCalledWith('org_1', {
      taskId: 'task_1',
      triggerType: 'RELATIVE',
      offsetSeconds: -900,
      action: 'NOTIFICATION',
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(response.status).toBe(201)
  })

  it('rejects browser attempts to supply server-owned assignment fields', async () => {
    const response = await handlePostTaskAssignment(
      new Request('https://invoice.test/api/tasks/task_1/assignments', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'USER',
          assigneeId: 'user_2',
          assignedBy: 'attacker',
          status: 'COMPLETED',
        }),
      }),
      'task_1'
    )

    expect(response.status).toBe(422)
    expect(mocks.createAssignment).not.toHaveBeenCalled()
  })
})
