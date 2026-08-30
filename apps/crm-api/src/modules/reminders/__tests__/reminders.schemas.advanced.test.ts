import { describe, expect, it } from 'vitest'

import {
  createReminderBodySchema,
  deleteReminderBodySchema,
  reminderParamsSchema,
  requestParamsSchema,
  updateReminderBodySchema,
} from '../reminders.schemas.js'

const validRemindAt = Math.floor(Date.parse('2026-09-01T10:00:00.000Z') / 1000)

describe('reminders.schemas - requestParamsSchema', () => {
  it('parses and trims organizationId and id', () => {
    expect(
      requestParamsSchema.parse({ organizationId: ' org_1 ', id: ' req_1 ' })
    ).toEqual({
      organizationId: 'org_1',
      id: 'req_1',
    })
  })

  it('rejects empty or missing fields and unknown fields', () => {
    expect(() =>
      requestParamsSchema.parse({ organizationId: 'org_1' })
    ).toThrow()
    expect(() =>
      requestParamsSchema.parse({ organizationId: '', id: 'req_1' })
    ).toThrow()
    expect(() =>
      requestParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        extra: 'x',
      })
    ).toThrow()
  })
})

describe('reminders.schemas - reminderParamsSchema', () => {
  it('parses all three segments and trims', () => {
    expect(
      reminderParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        reminderId: ' rem_1 ',
      })
    ).toEqual({ organizationId: 'org_1', id: 'req_1', reminderId: 'rem_1' })
  })

  it('rejects missing reminderId or empty', () => {
    expect(() =>
      reminderParamsSchema.parse({ organizationId: 'org_1', id: 'req_1' })
    ).toThrow()
    expect(() =>
      reminderParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        reminderId: '',
      })
    ).toThrow()
  })
})

describe('reminders.schemas - createReminderBodySchema', () => {
  const base = {
    title: ' Follow up ',
    note: 'call customer',
    remindAt: validRemindAt,
    userId: ' usr_1 ',
    createdBy: ' usr_1 ',
  }

  it('parses valid minimal input and trims', () => {
    const parsed = createReminderBodySchema.parse({
      title: 'hello',
      remindAt: validRemindAt,
      userId: 'usr_1',
      createdBy: 'usr_1',
    })
    expect(parsed.title).toBe('hello')
    expect(parsed.remindAt).toBe(validRemindAt)
  })

  it('trims title and userId/createdBy', () => {
    const parsed = createReminderBodySchema.parse(base)
    expect(parsed.title).toBe('Follow up')
    expect(parsed.userId).toBe('usr_1')
    expect(parsed.createdBy).toBe('usr_1')
  })

  it('accepts optional note null and all statuses', () => {
    for (const status of [
      'SCHEDULED',
      'SENT',
      'DISMISSED',
      'CANCELLED',
    ] as const) {
      expect(createReminderBodySchema.parse({ ...base, status }).status).toBe(
        status
      )
    }
    expect(
      createReminderBodySchema.parse({ ...base, note: null }).note
    ).toBeNull()
    expect(
      createReminderBodySchema.parse({
        title: 'x',
        remindAt: validRemindAt,
        userId: 'usr_1',
        createdBy: 'usr_1',
      }).note
    ).toBeUndefined()
  })

  it('enforces title min 1 and max 240 and note max 10_000', () => {
    expect(() =>
      createReminderBodySchema.parse({ ...base, title: '' })
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({ ...base, title: '   ' })
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({ ...base, title: 'a'.repeat(241) })
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({ ...base, note: 'a'.repeat(10_001) })
    ).toThrow()
  })

  it('requires remindAt as integer unix seconds', () => {
    expect(() =>
      createReminderBodySchema.parse({
        ...base,
        remindAt: '2026-09-01' as unknown as number,
      })
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({ ...base, remindAt: 1.5 })
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({
        title: 'x',
        userId: 'usr_1',
        createdBy: 'usr_1',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })

  it('rejects unknown fields and invalid status', () => {
    expect(() =>
      createReminderBodySchema.parse({ ...base, extra: 1 } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
    expect(() =>
      createReminderBodySchema.parse({
        ...base,
        status: 'UNKNOWN' as unknown as string,
      })
    ).toThrow()
  })
})

describe('reminders.schemas - updateReminderBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => updateReminderBodySchema.parse({})).toThrow()
  })

  it('accepts partial updates and trims title', () => {
    expect(
      updateReminderBodySchema.parse({ title: '  New title  ' }).title
    ).toBe('New title')
    expect(updateReminderBodySchema.parse({ note: null }).note).toBeNull()
    expect(
      updateReminderBodySchema.parse({ remindAt: validRemindAt }).remindAt
    ).toBe(validRemindAt)
  })

  it('validates title and note limits on update', () => {
    expect(() => updateReminderBodySchema.parse({ title: '' })).toThrow()
    expect(() =>
      updateReminderBodySchema.parse({ title: 'a'.repeat(241) })
    ).toThrow()
    expect(() =>
      updateReminderBodySchema.parse({ note: 'a'.repeat(10_001) })
    ).toThrow()
  })

  it('allows updating status alone', () => {
    expect(updateReminderBodySchema.parse({ status: 'DISMISSED' }).status).toBe(
      'DISMISSED'
    )
  })

  it('rejects unknown fields', () => {
    expect(() =>
      updateReminderBodySchema.parse({ unknown: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })

  it('requires remindAt to be integer when provided', () => {
    expect(() =>
      updateReminderBodySchema.parse({ remindAt: 'now' as unknown as number })
    ).toThrow()
    expect(() => updateReminderBodySchema.parse({ remindAt: 1.1 })).toThrow()
  })
})

describe('reminders.schemas - deleteReminderBodySchema', () => {
  it('parses and trims deletedBy', () => {
    expect(deleteReminderBodySchema.parse({ deletedBy: '  usr_1  ' })).toEqual({
      deletedBy: 'usr_1',
    })
  })

  it('rejects missing, empty, or unknown fields', () => {
    expect(() => deleteReminderBodySchema.parse({})).toThrow()
    expect(() => deleteReminderBodySchema.parse({ deletedBy: '' })).toThrow()
    expect(() =>
      deleteReminderBodySchema.parse({
        deletedBy: 'usr_1',
        extra: 'x',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})
