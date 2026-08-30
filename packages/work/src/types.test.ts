import { describe, expect, it } from 'vitest'

import {
  createWorkTaskInputSchema,
  updateWorkReminderInputSchema,
  updateWorkTaskInputSchema,
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

  it('strips no hidden request ownership into a canonical Work task', () => {
    const result = workTaskSchema.parse({
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
    expect('requestId' in result).toBe(false)
  })

  it('rejects empty task and reminder patches', () => {
    expect(updateWorkTaskInputSchema.safeParse({}).success).toBe(false)
    expect(updateWorkReminderInputSchema.safeParse({}).success).toBe(false)
  })

  it('enforces the same current text bounds at the service boundary', () => {
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'x'.repeat(241),
        createdBy: 'user_1',
      }).success
    ).toBe(false)
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'Task',
        description: 'x'.repeat(10_001),
        createdBy: 'user_1',
      }).success
    ).toBe(false)
  })
})
