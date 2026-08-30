import { describe, expect, it } from 'vitest'

import {
  createWorkTaskInputSchema,
  workContextSchema,
  workTaskSchema,
} from './types'

describe('Work foundation contracts', () => {
  it('models cross-service context without a CRM request foreign key', () => {
    expect(
      workContextSchema.parse({ service: 'crm', resource: 'request', id: 'req_1' })
    ).toEqual({ service: 'crm', resource: 'request', id: 'req_1' })
  })

  it('allows a task without context so Work is not permanently CRM-bound', () => {
    expect(
      createWorkTaskInputSchema.parse({ title: 'Prepare rota', createdBy: 'user_1' })
    ).toMatchObject({ title: 'Prepare rota', createdBy: 'user_1' })
  })

  it('does not expose requestId as canonical Work task ownership', () => {
    const result = workTaskSchema.safeParse({
      object: 'task',
      id: 'task_1',
      organizationId: 'org_1',
      requestId: 'req_1',
      context: null,
      title: 'Task',
      description: null,
      status: 'OPEN',
      priorityId: null,
      assigneeId: null,
      dueAt: null,
      completedAt: null,
      completedBy: null,
      sortOrder: 0,
      createdBy: 'user_1',
      createdAt: 1,
      updatedAt: 1,
    })
    expect(result.success).toBe(true)
    if (result.success)
      expect('requestId' in result.data).toBe(false)
  })
})
