import { describe, expect, it } from 'vitest'

import { currencyExponent, formatMoney, majorToMinor } from './money'

describe('currencyExponent', () => {
  it('returns 2 for usd, jmd and unknown currencies', () => {
    expect(currencyExponent('usd')).toBe(2)
    expect(currencyExponent('jmd')).toBe(2)
    expect(currencyExponent('eur')).toBe(2)
    expect(currencyExponent('unknown')).toBe(2)
  })

  it('returns 0 for jpy and krw', () => {
    expect(currencyExponent('jpy')).toBe(0)
    expect(currencyExponent('krw')).toBe(0)
  })

  it('returns 3 for bhd and jod', () => {
    expect(currencyExponent('bhd')).toBe(3)
    expect(currencyExponent('jod')).toBe(3)
  })

  it('is case-insensitive', () => {
    expect(currencyExponent('USD')).toBe(2)
    expect(currencyExponent('Jpy')).toBe(0)
    expect(currencyExponent('BHD')).toBe(3)
    expect(currencyExponent('JMD')).toBe(2)
  })
})

describe('majorToMinor', () => {
  it('converts decimals without floating-point arithmetic', () => {
    expect(majorToMinor('12.34', 'jmd')).toBe(1234)
  })
  it('supports zero-decimal currencies', () => {
    expect(majorToMinor('12', 'jpy')).toBe(12)
  })
  it('supports three-decimal currencies', () => {
    expect(majorToMinor('12.340', 'bhd')).toBe(12340)
  })
  it('preserves trailing zeros', () => {
    expect(majorToMinor('0.10', 'usd')).toBe(10)
  })
  it('rejects excess decimal places rather than truncating', () => {
    expect(() => majorToMinor('1.001', 'usd')).toThrow(
      'supports 2 decimal places'
    )
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(majorToMinor('  12.34  ', 'usd')).toBe(1234)
    expect(majorToMinor('\t0.10\n', 'usd')).toBe(10)
  })

  it('handles whole amounts without a decimal point', () => {
    expect(majorToMinor('100', 'usd')).toBe(10000)
    expect(majorToMinor('0', 'usd')).toBe(0)
    expect(majorToMinor('0', 'jpy')).toBe(0)
  })

  it('pads fractional part to the currency exponent', () => {
    expect(majorToMinor('1.5', 'usd')).toBe(150)
    expect(() => majorToMinor('1.5', 'jpy')).toThrow(
      'supports 0 decimal places'
    )
    expect(majorToMinor('1.5', 'bhd')).toBe(1500)
    expect(majorToMinor('12.3', 'bhd')).toBe(12300)
  })

  it('strips leading zeros from the concatenated digits', () => {
    expect(majorToMinor('00012.34', 'usd')).toBe(1234)
    expect(majorToMinor('0000.10', 'usd')).toBe(10)
    expect(majorToMinor('00', 'usd')).toBe(0)
  })

  it('treats 0.00 as zero', () => {
    expect(majorToMinor('0.00', 'usd')).toBe(0)
    expect(majorToMinor('00.000', 'bhd')).toBe(0)
  })

  it('rejects negative amounts', () => {
    expect(() => majorToMinor('-1.00', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
    expect(() => majorToMinor('-0.10', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects empty and non-numeric inputs', () => {
    expect(() => majorToMinor('', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
    expect(() => majorToMinor('  ', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
    expect(() => majorToMinor('abc', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
    expect(() => majorToMinor('12.34.56', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
    expect(() => majorToMinor('12a.34', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects a decimal point with no digits after it', () => {
    expect(() => majorToMinor('12.', 'usd')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects excess decimals for zero-decimal currencies', () => {
    expect(() => majorToMinor('12.1', 'jpy')).toThrow(
      'supports 0 decimal places'
    )
    expect(() => majorToMinor('12.00', 'jpy')).toThrow(
      'supports 0 decimal places'
    )
  })

  it('rejects excess decimals for three-decimal currencies', () => {
    expect(() => majorToMinor('1.0001', 'bhd')).toThrow(
      'supports 3 decimal places'
    )
    expect(() => majorToMinor('1.0001', 'jod')).toThrow(
      'supports 3 decimal places'
    )
  })

  it('handles the maximum safe integer boundary', () => {
    const maxSafe = Number.MAX_SAFE_INTEGER.toString()
    expect(majorToMinor(maxSafe, 'jpy')).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('throws when the minor amount exceeds safe integer', () => {
    const tooLarge = (Number.MAX_SAFE_INTEGER + 1).toString()
    expect(() => majorToMinor(tooLarge, 'jpy')).toThrow('Amount is too large.')
    expect(() => majorToMinor('90071992547409.99', 'usd')).toThrow(
      'Amount is too large.'
    )
  })

  it('accepts unknown currencies with the default exponent 2', () => {
    expect(majorToMinor('12.34', 'eur')).toBe(1234)
    expect(majorToMinor('12.34', 'cad')).toBe(1234)
    expect(() => majorToMinor('12.345', 'eur')).toThrow(
      'supports 2 decimal places'
    )
  })

  it('preserves exact decimal precision without floating point errors', () => {
    expect(majorToMinor('0.07', 'usd')).toBe(7)
    expect(majorToMinor('0.10', 'usd')).toBe(10)
    expect(majorToMinor('1.10', 'usd')).toBe(110)
    expect(majorToMinor('0.001', 'bhd')).toBe(1)
  })

  it('handles very small fractions padded to exponent', () => {
    expect(majorToMinor('0.01', 'usd')).toBe(1)
    expect(majorToMinor('0.001', 'bhd')).toBe(1)
    expect(majorToMinor('0.010', 'bhd')).toBe(10)
  })

  it('reports the correct currency code in exponent errors', () => {
    expect(() => majorToMinor('1.001', 'USD')).toThrow(
      'USD supports 2 decimal places'
    )
    expect(() => majorToMinor('1.1', 'JPY')).toThrow(
      'JPY supports 0 decimal places'
    )
  })
})

/** Intl separates the currency code with U+00A0; read it as a plain space. */
function shown(amount: number | null, currency: string): string {
  return formatMoney(amount, currency).replace(/\u00a0/g, ' ')
}

describe('formatMoney', () => {
  it('renders an em dash for an absent amount', () => {
    expect(shown(null, 'jmd')).toBe('—')
  })

  it('renders a two-decimal currency from its minor units', () => {
    expect(shown(150000, 'jmd')).toBe('JMD 1,500.00')
  })

  it('renders a zero-decimal currency without inventing decimals', () => {
    // 1500 JPY is 1,500 yen, not 15.00 — a hardcoded /100 gets this wrong.
    expect(shown(1500, 'jpy')).toBe('¥1,500')
  })

  it('renders a three-decimal currency at full precision', () => {
    expect(shown(1500, 'jod')).toBe('JOD 1.500')
  })

  it('renders zero rather than treating it as absent', () => {
    expect(shown(0, 'jmd')).toBe('JMD 0.00')
  })

  it('round-trips a written amount back to what was entered', () => {
    expect(shown(majorToMinor('12.34', 'jmd'), 'jmd')).toBe('JMD 12.34')
  })
})
