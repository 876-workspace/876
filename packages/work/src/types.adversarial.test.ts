import { describe, it, expect } from 'vitest'
import {
  createWorkTaskInputSchema,
  updateWorkTaskInputSchema,
  createWorkReminderInputSchema,
  updateWorkReminderInputSchema,
  workContextSchema,
} from './types'

describe('Work Service Types - Adversarial & Contract Tests', () => {
  const SECURITY_CORPUS = [
    '<script>alert(1)</script>',
    "' OR '1'='1",
    '../../etc/passwd',
    '__proto__',
    'constructor',
    '\u0000',
    '\u202E', // right-to-left override
    '\uD800', // lone high surrogate
    '\u00A0', // non-breaking space
    'a'.repeat(10_000),
    'a'.repeat(10_001),
  ]

  const baseTask = {
    title: 'Confirm the delivery window with Alejandra',
    createdBy: 'user_2kL9mN4q',
  }

  const baseReminder = {
    title: 'Call Alejandra about the delayed parcel',
    remindAt: 1_788_008_400,
    userId: 'user_9pQ2rS7t',
    createdBy: 'user_2kL9mN4q',
  }

  describe('Security Corpus on string inputs', () => {
    describe('createWorkTaskInputSchema', () => {
      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in title',
        (input) => {
          const result = createWorkTaskInputSchema.safeParse({
            ...baseTask,
            title: input,
          })
          const trimmed = input.trim()
          if (trimmed.length < 1 || trimmed.length > 240) {
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.error.issues[0].code).toMatch(/too_small|too_big/)
            }
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.title).toBe(trimmed) // Must not silently sanitize beyond trimming
            }
          }
        }
      )

      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in description',
        (input) => {
          const result = createWorkTaskInputSchema.safeParse({
            ...baseTask,
            description: input,
          })
          if (input.length > 10_000) {
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.error.issues[0].code).toBe('too_big')
            }
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.description).toBe(input) // description is not trimmed in schema
            }
          }
        }
      )

      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in priorityId',
        (input) => {
          const result = createWorkTaskInputSchema.safeParse({
            ...baseTask,
            priorityId: input,
          })
          const trimmed = input.trim()
          if (trimmed.length < 1) {
            expect(result.success).toBe(false)
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.priorityId).toBe(trimmed)
            }
          }
        }
      )

      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in createdBy',
        (input) => {
          const result = createWorkTaskInputSchema.safeParse({
            ...baseTask,
            createdBy: input,
          })
          const trimmed = input.trim()
          if (trimmed.length < 1) {
            expect(result.success).toBe(false)
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.createdBy).toBe(trimmed)
            }
          }
        }
      )
    })

    describe('createWorkReminderInputSchema', () => {
      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in note',
        (input) => {
          const result = createWorkReminderInputSchema.safeParse({
            ...baseReminder,
            note: input,
          })
          if (input.length > 10_000) {
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.error.issues[0].code).toBe('too_big')
            }
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.note).toBe(input) // note is not trimmed
            }
          }
        }
      )
    })

    describe('workContextSchema', () => {
      it.each(SECURITY_CORPUS)(
        'handles adversarial input: %j in service',
        (input) => {
          const context = { service: input, resource: 'req', id: '123' }
          const result = workContextSchema.safeParse(context)
          const trimmed = input.trim()
          if (trimmed.length < 1) {
            expect(result.success).toBe(false)
          } else {
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.service).toBe(trimmed)
            }
          }
        }
      )
    })
  })

  describe('title rules', () => {
    it('is bounded to 240, 241 fails', () => {
      const p240 = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        title: 'a'.repeat(240),
      })
      expect(p240.success).toBe(true)

      const p241 = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        title: 'a'.repeat(241),
      })
      expect(p241.success).toBe(false)
    })

    it('counts UTF-16 code units, so 240 emoji is 480 units and fails', () => {
      // JS String.length counts UTF-16 code units.
      // 1 emoji = 2 units. 240 emojis = 480 units.
      // The schema's .max(240) applies to the string length, so 240 emojis will fail.
      const p120emoji = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        title: '👍'.repeat(120),
      })
      expect(p120emoji.success).toBe(true)

      const p240emoji = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        title: '👍'.repeat(240),
      })
      expect(p240emoji.success).toBe(false)
    })

    it('trims whitespace and strips non-breaking space', () => {
      const inputs = ['   ', '\t', '\n', '\u00A0']
      inputs.forEach((input) => {
        const result = createWorkTaskInputSchema.safeParse({
          ...baseTask,
          title: input,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].code).toBe('too_small')
        }
      })

      const okResult = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        title: ' \u00A0 foo \n\t ',
      })
      expect(okResult.success).toBe(true)
      if (okResult.success) {
        expect(okResult.data.title).toBe('foo')
      }
    })
  })

  describe('description and note boundaries', () => {
    it('allows exactly 10000 characters', () => {
      expect(
        createWorkTaskInputSchema.safeParse({
          ...baseTask,
          description: 'a'.repeat(10000),
        }).success
      ).toBe(true)
      expect(
        createWorkReminderInputSchema.safeParse({
          ...baseReminder,
          note: 'a'.repeat(10000),
        }).success
      ).toBe(true)
    })
    it('rejects 10001 characters', () => {
      expect(
        createWorkTaskInputSchema.safeParse({
          ...baseTask,
          description: 'a'.repeat(10001),
        }).success
      ).toBe(false)
      expect(
        createWorkReminderInputSchema.safeParse({
          ...baseReminder,
          note: 'a'.repeat(10001),
        }).success
      ).toBe(false)
    })
  })

  describe('strictObject rejects unknown keys', () => {
    it('rejects unknown key on createWorkTaskInputSchema', () => {
      const result = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        unknownKey: 'foo',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('unrecognized_keys')
      }
    })
    it('rejects unknown key on workContextSchema', () => {
      const result = workContextSchema.safeParse({
        service: 'a',
        resource: 'b',
        id: 'c',
        extra: 'd',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('update schemas refinement', () => {
    it('rejects {} on updateWorkTaskInputSchema', () => {
      const result = updateWorkTaskInputSchema.safeParse({})
      expect(result.success).toBe(false)
    })
    it('accepts a single field set to null on updateWorkTaskInputSchema', () => {
      const result = updateWorkTaskInputSchema.safeParse({ assigneeId: null })
      expect(result.success).toBe(true)
    })
    it('rejects {} on updateWorkReminderInputSchema', () => {
      const result = updateWorkReminderInputSchema.safeParse({})
      expect(result.success).toBe(false)
    })
    it('accepts a single field on updateWorkReminderInputSchema', () => {
      const result = updateWorkReminderInputSchema.safeParse({
        title: 'new title',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('dueAt and remindAt validation', () => {
    const validTimes = [-1000, 0, Number.MAX_SAFE_INTEGER]
    const invalidTimes = [1.5, NaN, Infinity, -Infinity, '1234']

    it.each(validTimes)('accepts %p and preserves it exactly', (time) => {
      const task = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        dueAt: time,
      })
      expect(task.success).toBe(true)
      if (task.success) expect(task.data.dueAt).toBe(time)

      const reminder = createWorkReminderInputSchema.safeParse({
        ...baseReminder,
        remindAt: time,
      })
      expect(reminder.success).toBe(true)
      if (reminder.success) expect(reminder.data.remindAt).toBe(time)
    })

    // safeParse takes unknown, so these need no ts-expect-error — the point is
    // that a value arriving over HTTP is not constrained by TypeScript at all.
    it.each(invalidTimes)('rejects %p on the integer contract', (time) => {
      const task = createWorkTaskInputSchema.safeParse({
        ...baseTask,
        dueAt: time,
      })
      expect(task.success).toBe(false)
      if (!task.success) expect(task.error.issues[0]?.path).toEqual(['dueAt'])

      const reminder = createWorkReminderInputSchema.safeParse({
        ...baseReminder,
        remindAt: time,
      })
      expect(reminder.success).toBe(false)
      if (!reminder.success)
        expect(reminder.error.issues[0]?.path).toEqual(['remindAt'])
    })
  })

  describe('workContextSchema properties', () => {
    it('requires all three parts and rejects empty strings', () => {
      expect(
        workContextSchema.safeParse({ resource: 'r', id: '1' }).success
      ).toBe(false)
      expect(
        workContextSchema.safeParse({ service: 's', id: '1' }).success
      ).toBe(false)
      expect(
        workContextSchema.safeParse({ service: 's', resource: 'r' }).success
      ).toBe(false)
      expect(
        workContextSchema.safeParse({ service: '', resource: 'r', id: '1' })
          .success
      ).toBe(false)
    })
    it('trims all parts', () => {
      const res = workContextSchema.safeParse({
        service: ' s ',
        resource: ' r ',
        id: ' 1 ',
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toEqual({ service: 's', resource: 'r', id: '1' })
      }
    })
  })

  describe('Prototype pollution', () => {
    it('parsing an input object with __proto__ must not pollute Object.prototype', () => {
      const malicious = JSON.parse(
        '{"title":"foo","createdBy":"user","__proto__":{"polluted":"yes"}}'
      )
      const result = createWorkTaskInputSchema.safeParse(malicious)
      expect(result.success).toBe(true)
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })
  })
})
