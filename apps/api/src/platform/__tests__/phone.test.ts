/** Ported from the E.164 cases `core/phone.py` accepts and rejects. */

import { describe, expect, it } from 'vitest'

import { normalizePhoneNumber } from '../phone'

describe('normalizePhoneNumber', () => {
  it.each([
    ['+18765550123', '+18765550123'],
    ['  +18765550123  ', '+18765550123'],
    ['+1 (876) 555-0123', '+18765550123'],
    ['+1.876.555.0123', '+18765550123'],
    ['+44 20 7946 0958', '+442079460958'],
    // Minimum and maximum E.164 lengths.
    ['+12345678', '+12345678'],
    ['+123456789012345', '+123456789012345'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected)
  })

  it.each([
    ['a bare national number', '8765550123'],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a leading zero after the plus', '+0876555012'],
    ['too few digits', '+1234567'],
    ['too many digits', '+1234567890123456'],
    ['letters', '+1876ABC0123'],
    ['an embedded plus', '+1876+5550123'],
    ['a lookalike unicode plus', '＋18765550123'],
    ['an extension suffix', '+18765550123 ext. 4'],
  ])('rejects %s', (_label, input) => {
    expect(() => normalizePhoneNumber(input)).toThrow(
      expect.objectContaining({
        code: 'communications/invalid-phone-number',
        httpStatus: 400,
      })
    )
  })

  it('does not echo the rejected input in the client-facing error', () => {
    try {
      normalizePhoneNumber('+1876ABC0123')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect((error as { message: string }).message).toBe(
        'Enter a valid international phone number.'
      )
    }
  })
})
