import { describe, expect, it } from 'vitest'

import {
  createTaskBodySchema,
  deleteTaskBodySchema,
  taskParamsSchema,
  requestParamsSchema,
  updateTaskBodySchema,
} from '../tasks.schemas.js'

const validDueAt = Math.floor(Date.parse('2026-09-10T12:00:00.000Z') / 1000)

describe('tasks.schemas - requestParamsSchema', () => {
  it('parses and trims organizationId and id', () => {
    expect(
      requestParamsSchema.parse({ organizationId: ' org_1 ', id: ' req_1 ' })
    ).toEqual({
      organizationId: 'org_1',
      id: 'req_1',
    })
  })

  it('rejects empty or missing and unknown fields', () => {
    expect(() =>
      requestParamsSchema.parse({ organizationId: '', id: 'req_1' })
    ).toThrow()
    expect(() =>
      requestParamsSchema.parse({ organizationId: 'org_1' })
    ).toThrow()
    expect(() =>
      requestParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        extra: 1,
      })
    ).toThrow()
  })
})

describe('tasks.schemas - taskParamsSchema', () => {
  it('parses all three segments and trims', () => {
    expect(
      taskParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        taskId: ' task_1 ',
      })
    ).toEqual({
      organizationId: 'org_1',
      id: 'req_1',
      taskId: 'task_1',
    })
  })

  it('rejects missing taskId', () => {
    expect(() =>
      taskParamsSchema.parse({ organizationId: 'org_1', id: 'req_1' })
    ).toThrow()
    expect(() =>
      taskParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        taskId: '',
      })
    ).toThrow()
  })
})

describe('tasks.schemas - createTaskBodySchema', () => {
  const base = { title: '  Do the thing  ', createdBy: ' usr_1 ' }

  it('parses minimal valid input and trims', () => {
    const parsed = createTaskBodySchema.parse(base)
    expect(parsed.title).toBe('Do the thing')
    expect(parsed.createdBy).toBe('usr_1')
  })

  it('enforces title min 1 max 240', () => {
    expect(() => createTaskBodySchema.parse({ ...base, title: '' })).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ ...base, title: '   ' })
    ).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ ...base, title: 'a'.repeat(241) })
    ).toThrow()
    expect(
      createTaskBodySchema.parse({ ...base, title: 'a'.repeat(240) }).title
    ).toHaveLength(240)
  })

  it('accepts optional description null and rich content validation', () => {
    expect(
      createTaskBodySchema.parse({ ...base, description: null }).description
    ).toBeNull()
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hello' } }],
    })
    expect(
      createTaskBodySchema.parse({ ...base, description: rich }).description
    ).toBe(rich)
    expect(() =>
      createTaskBodySchema.parse({ ...base, description: 'a'.repeat(10_001) })
    ).toThrow()
  })

  it('accepts status enum', () => {
    for (const status of [
      'OPEN',
      'IN_PROGRESS',
      'DONE',
      'CANCELLED',
    ] as const) {
      expect(createTaskBodySchema.parse({ ...base, status }).status).toBe(
        status
      )
    }
    expect(() =>
      createTaskBodySchema.parse({
        ...base,
        status: 'UNKNOWN' as unknown as string,
      })
    ).toThrow()
  })

  it('accepts priorityId, assigneeId, dueAt variations', () => {
    expect(
      createTaskBodySchema.parse({ ...base, priorityId: 'crm_pri_1' })
        .priorityId
    ).toBe('crm_pri_1')
    expect(
      createTaskBodySchema.parse({ ...base, assigneeId: null }).assigneeId
    ).toBeNull()
    expect(
      createTaskBodySchema.parse({ ...base, assigneeId: 'usr_2' }).assigneeId
    ).toBe('usr_2')
    expect(
      createTaskBodySchema.parse({ ...base, dueAt: validDueAt }).dueAt
    ).toBe(validDueAt)
    expect(
      createTaskBodySchema.parse({ ...base, dueAt: null }).dueAt
    ).toBeNull()
    expect(
      createTaskBodySchema.parse({ ...base, sortOrder: 5 }).sortOrder
    ).toBe(5)
  })

  it('trims priorityId and rejects empty', () => {
    expect(
      createTaskBodySchema.parse({ ...base, priorityId: '  crm_pri_1  ' })
        .priorityId
    ).toBe('crm_pri_1')
    expect(() =>
      createTaskBodySchema.parse({ ...base, priorityId: '' })
    ).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ ...base, priorityId: '   ' })
    ).toThrow()
  })

  it('requires dueAt to be integer when provided', () => {
    expect(() =>
      createTaskBodySchema.parse({ ...base, dueAt: 'now' as unknown as number })
    ).toThrow()
    expect(() => createTaskBodySchema.parse({ ...base, dueAt: 1.5 })).toThrow()
  })

  it('rejects unknown fields and removed priority enum', () => {
    expect(() =>
      createTaskBodySchema.parse({
        ...base,
        priority: 'HIGH' as unknown as string,
      })
    ).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ ...base, extra: 1 } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })

  it('requires createdBy and trims', () => {
    expect(() =>
      createTaskBodySchema.parse({ title: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ title: 'x', createdBy: '' })
    ).toThrow()
    expect(
      createTaskBodySchema.parse({ title: 'x', createdBy: '  usr_1  ' })
        .createdBy
    ).toBe('usr_1')
  })
})

describe('tasks.schemas - updateTaskBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => updateTaskBodySchema.parse({})).toThrow()
  })

  it('accepts partial title, description, status', () => {
    expect(updateTaskBodySchema.parse({ title: '  New  ' }).title).toBe('New')
    expect(
      updateTaskBodySchema.parse({ description: null }).description
    ).toBeNull()
    expect(updateTaskBodySchema.parse({ status: 'DONE' }).status).toBe('DONE')
  })

  it('accepts priorityId change and clears', () => {
    expect(
      updateTaskBodySchema.parse({ priorityId: 'crm_pri_2' }).priorityId
    ).toBe('crm_pri_2')
  })

  it('accepts dueAt and assigneeId changes with timestamp handling', () => {
    expect(updateTaskBodySchema.parse({ dueAt: validDueAt }).dueAt).toBe(
      validDueAt
    )
    expect(updateTaskBodySchema.parse({ dueAt: null }).dueAt).toBeNull()
    expect(
      updateTaskBodySchema.parse({ assigneeId: null }).assigneeId
    ).toBeNull()
    expect(updateTaskBodySchema.parse({ sortOrder: 10 }).sortOrder).toBe(10)
  })

  it('accepts completedBy for audit stamp', () => {
    expect(
      updateTaskBodySchema.parse({ completedBy: 'usr_2' }).completedBy
    ).toBe('usr_2')
    expect(
      updateTaskBodySchema.parse({ completedBy: null }).completedBy
    ).toBeNull()
    expect(() => updateTaskBodySchema.parse({ completedBy: '' })).toThrow()
  })

  it('enforces title max 240 on update', () => {
    expect(() =>
      updateTaskBodySchema.parse({ title: 'a'.repeat(241) })
    ).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() =>
      updateTaskBodySchema.parse({ unknown: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })
})

describe('tasks.schemas - deleteTaskBodySchema', () => {
  it('parses and trims deletedBy', () => {
    expect(deleteTaskBodySchema.parse({ deletedBy: '  usr_1  ' })).toEqual({
      deletedBy: 'usr_1',
    })
  })

  it('rejects missing, empty, or unknown fields', () => {
    expect(() =>
      deleteTaskBodySchema.parse({} as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() => deleteTaskBodySchema.parse({ deletedBy: '' })).toThrow()
    expect(() =>
      deleteTaskBodySchema.parse({
        deletedBy: 'usr_1',
        extra: 1,
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})
