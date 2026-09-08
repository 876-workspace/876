import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PATCH } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))

const TASK = {
  object: 'task' as const,
  id: 'task_1',
  uid: 'task-uid-1',
  organizationId: 'org_1',
  listId: 'list_1',
  parentTaskId: null,
  context: null,
  links: [],
  title: 'Reconcile invoice',
  description: null,
  status: 'DONE' as const,
  importance: 'NORMAL' as const,
  priorityId: null,
  assigneeId: 'user_1',
  assignments: [],
  startAt: null,
  startTimeZone: null,
  dueAt: 200,
  dueTimeZone: 'America/New_York',
  estimatedDuration: null,
  percentComplete: 100,
  recurrenceRuleId: null,
  completedAt: 150,
  completedBy: 'user_1',
  isOverdue: false,
  sortOrder: 0,
  createdBy: 'user_1',
  createdAt: 100,
  updatedAt: 150,
}

function request(body: unknown = { action: 'complete' }) {
  return new Request('http://invoice.test/api/tasks/task_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(taskId = 'task_1') {
  return { params: Promise.resolve({ taskId }) }
}

describe('PATCH /api/tasks/[taskId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ tasks: { update: mocks.update } })
    mocks.update.mockResolvedValue({ data: TASK, error: null })
  })

  it('returns the Work widget access response before reading Work', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
        { status: 403 }
      ),
    })

    const response = await PATCH(request(), context())

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('requires tasks.edit for every task action', async () => {
    await PATCH(request(), context())

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith('tasks.edit')
  })

  it('rejects browser-owned canonical identity or status fields', async () => {
    const response = await PATCH(
      request({ action: 'complete', status: 'DONE', assigneeId: 'user_2' }),
      context()
    )
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON and blank task ids', async () => {
    const badJson = new Request('http://invoice.test/api/tasks/task_1', {
      method: 'PATCH',
      body: '{',
    })

    const invalidBodyResponse = await PATCH(badJson, context())
    const blankIdResponse = await PATCH(request(), context('   '))

    expect(invalidBodyResponse.status).toBe(422)
    expect(blankIdResponse.status).toBe(422)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('stamps completion with the acting user', async () => {
    const response = await PATCH(request({ action: 'complete' }), context())
    const payload = await response.json()

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'task_1', {
      status: 'DONE',
      completedBy: 'user_1',
    })
    expect(response.status).toBe(200)
    expect(payload).toEqual({ data: TASK, error: null })
  })

  it('maps cancel to the canonical cancelled status', async () => {
    await PATCH(request({ action: 'cancel' }), context())

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'task_1', {
      status: 'CANCELLED',
    })
  })

  it('maps editable fields and due clearing without identity fields', async () => {
    await PATCH(
      request({
        action: 'update',
        title: 'Updated task',
        description: 'Updated details',
        importance: 'HIGH',
        due: null,
      }),
      context()
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'task_1', {
      title: 'Updated task',
      description: 'Updated details',
      importance: 'HIGH',
      dueAt: null,
      dueTimeZone: null,
    })
  })

  it('preserves registered Work authorization failures', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'work/session-forbidden',
        message: 'You do not have permission to perform this Work action.',
      },
    })

    const response = await PATCH(request(), context())
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('work/session-forbidden')
  })

  it('sanitizes unknown upstream task failures', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'sensitive provider detail' },
    })

    const response = await PATCH(request(), context())
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error).toEqual({
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    })
  })
})