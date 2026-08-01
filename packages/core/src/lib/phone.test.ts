import { describe, expect, it } from 'vitest'

import { formatPhone, normalizePhone, parsePhone } from './phone'

describe('normalizePhone', () => {
  it('normalizes raw Jamaican NANP digits', () => {
    expect(normalizePhone('18765555555')).toBe('+18765555555')
  })

  it('normalizes Jamaican E.164 digits', () => {
    expect(normalizePhone('+18765555555')).toBe('+18765555555')
  })

  it('normalizes a Jamaican national number with a default country', () => {
    expect(normalizePhone('8765555555', 'JM')).toBe('+18765555555')
  })

  it('returns null for a bare national number without a default country', () => {
    expect(normalizePhone('8765555555')).toBeNull()
  })

  it('normalizes formatted Jamaican input', () => {
    expect(normalizePhone('+1 (876) 555-5555')).toBe('+18765555555')
  })

  it.each(['', 'abc', '12', '1'.repeat(40)])(
    'returns null for an unparseable input',
    (input) => {
      expect(normalizePhone(input)).toBeNull()
    }
  )

  it('returns null for a runtime null input', () => {
    expect(normalizePhone(null as unknown as string)).toBeNull()
  })

  it('returns null for a runtime undefined input', () => {
    expect(normalizePhone(undefined as unknown as string)).toBeNull()
  })
})

describe('formatPhone', () => {
  it('formats raw Jamaican NANP digits', () => {
    expect(formatPhone('18765555555')).toBe('+1 (876) 555-5555')
  })

  it('formats Jamaican E.164 digits', () => {
    expect(formatPhone('+18765555555')).toBe('+1 (876) 555-5555')
  })

  it('formats a Jamaican national number with a default country', () => {
    expect(formatPhone('8765555555', 'JM')).toBe('+1 (876) 555-5555')
  })

  it('returns a bare national number unchanged without a default country', () => {
    expect(formatPhone('8765555555')).toBe('8765555555')
  })

  it('formats an already formatted Jamaican number', () => {
    expect(formatPhone('+1 (876) 555-5555')).toBe('+1 (876) 555-5555')
  })

  it.each([
    ['Bahamas', '+12425551234', '+1 (242) 555-1234'],
    ['Barbados', '+12465551234', '+1 (246) 555-1234'],
    ['Trinidad and Tobago', '+18685551234', '+1 (868) 555-1234'],
  ])('formats $0 NANP numbers', (_country, input, expected) => {
    expect(formatPhone(input)).toBe(expected)
  })

  it('formats Cuban numbers without NANP grouping', () => {
    expect(formatPhone('5351234567')).toBe('+53 5 1234567')
  })

  it('formats Haitian numbers without NANP grouping', () => {
    expect(formatPhone('50912345678')).toBe('+509 1234 5678')
  })

  it('formats an unknown international dial code without resolving a country', () => {
    expect(formatPhone('+59012345678')).toBe('+590 1234 5678')
  })

  it.each(['', 'abc', '12', '1'.repeat(40)])(
    'returns an unparseable input unchanged',
    (input) => {
      expect(formatPhone(input)).toBe(input)
    }
  )

  it('returns a runtime null input unchanged', () => {
    expect(formatPhone(null as unknown as string)).toBeNull()
  })

  it('returns a runtime undefined input unchanged', () => {
    expect(formatPhone(undefined as unknown as string)).toBeUndefined()
  })
})

describe('parsePhone', () => {
  it('returns parsed Jamaican NANP parts', () => {
    expect(parsePhone('18765555555')).toEqual({
      areaCode: '876',
      countryCode: 'JM',
      dialCode: '+1',
      e164: '+18765555555',
      nationalNumber: '5555555',
    })
  })

  it('returns parsed Cuban parts', () => {
    expect(parsePhone('5351234567')).toEqual({
      areaCode: null,
      countryCode: 'CU',
      dialCode: '+53',
      e164: '+5351234567',
      nationalNumber: '51234567',
    })
  })

  it('returns parsed Haitian parts', () => {
    expect(parsePhone('50912345678')).toEqual({
      areaCode: null,
      countryCode: 'HT',
      dialCode: '+509',
      e164: '+50912345678',
      nationalNumber: '12345678',
    })
  })

  it('returns an unresolved country for an unknown international dial code', () => {
    expect(parsePhone('+59012345678')).toEqual({
      areaCode: null,
      countryCode: null,
      dialCode: '+590',
      e164: '+59012345678',
      nationalNumber: '12345678',
    })
  })

  it('returns null for a runtime null input', () => {
    expect(parsePhone(null as unknown as string)).toBeNull()
  })

  it('returns null for a runtime undefined input', () => {
    expect(parsePhone(undefined as unknown as string)).toBeNull()
  })
})
