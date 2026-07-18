import { describe, expect, it } from 'vitest'

import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH, NOTE_COLORS } from './types'
import { parseColor, validateEntryText } from './validate'

const SECURITY_TITLES = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000null-byte',
  'a'.repeat(MAX_TITLE_LENGTH),
] as const

describe('validateEntryText', () => {
  describe('when title is invalid', () => {
    it('when title is only whitespace, then rejects with widgets/invalid-title', () => {
      const result = validateEntryText(
        '   \t  ',
        'Valid body for the sticky note'
      )

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          status: 400,
          code: 'widgets/invalid-title',
        })
      )
      expect(result?.error).toMatch(/titles must be between 1 and/i)
    })

    it('when title is empty, then rejects with widgets/invalid-title', () => {
      const result = validateEntryText('', 'body')

      expect(result?.code).toBe('widgets/invalid-title')
      expect(result?.status).toBe(400)
    })

    it('when title exceeds the maximum length, then rejects with widgets/invalid-title', () => {
      const result = validateEntryText('x'.repeat(MAX_TITLE_LENGTH + 1), 'body')

      expect(result?.code).toBe('widgets/invalid-title')
      expect(result?.error).toContain(String(MAX_TITLE_LENGTH))
    })
  })

  describe('when body is invalid', () => {
    it('when body exceeds the maximum length, then rejects with widgets/invalid-body', () => {
      const result = validateEntryText(
        'Launch checklist',
        'x'.repeat(MAX_BODY_LENGTH + 1)
      )

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          status: 400,
          code: 'widgets/invalid-body',
        })
      )
      expect(result?.error).toContain(String(MAX_BODY_LENGTH))
    })
  })

  describe('when input is valid', () => {
    it('when title and body are within limits, then returns null (no error)', () => {
      expect(
        validateEntryText('Customer follow-up with Alejandra', 'Call at 3pm')
      ).toBeNull()
    })

    it('when title is at the maximum length, then accepts the entry', () => {
      expect(validateEntryText('T'.repeat(MAX_TITLE_LENGTH), '')).toBeNull()
    })

    it('when body is exactly the maximum length, then accepts the entry', () => {
      expect(
        validateEntryText('Boundary body', 'b'.repeat(MAX_BODY_LENGTH))
      ).toBeNull()
    })

    it.each(SECURITY_TITLES)(
      'when title is adversarial but within length (%j), then validation does not throw and accepts length-valid titles',
      (title) => {
        const result = validateEntryText(title, 'safe body')
        // Null-byte / script titles are length-valid; validation is size-only.
        if (title.trim().length > 0 && title.trim().length <= MAX_TITLE_LENGTH)
          expect(result).toBeNull()
      }
    )
  })
})

describe('parseColor', () => {
  it.each([...NOTE_COLORS])(
    'when color is known palette value %s, then returns that color',
    (color) => {
      expect(parseColor(color)).toBe(color)
    }
  )

  it('when color is omitted, then returns undefined so callers keep the existing value', () => {
    expect(parseColor(undefined)).toBeUndefined()
  })

  it.each(['orange', 'YELLOW', '', 12, null, {}, [], true] as const)(
    'when color is invalid %j, then returns a widgets/invalid-color error',
    (color) => {
      const result = parseColor(color)

      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          status: 400,
          code: 'widgets/invalid-color',
          error: 'Invalid note color.',
        })
      )
    }
  )
})
