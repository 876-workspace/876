import { describe, expect, it } from 'vitest'

import { currencyMinorUnitDigits, formatMoney, majorToMinor } from './currency'

describe('currencyMinorUnitDigits', () => {
  it.each([
    ['JMD', 2],
    ['USD', 2],
    ['JPY', 0],
    ['KRW', 0],
    ['BHD', 3],
    ['JOD', 3],
  ] as const)('reads the standard digits for %s', (currency, expected) => {
    expect(currencyMinorUnitDigits(currency)).toBe(expected)
  })

  it('normalises a lowercase currency code', () => {
    expect(currencyMinorUnitDigits('jmd')).toBe(2)
  })
})

describe('formatMoney', () => {
  it('renders JMD minor units with two decimal places', () => {
    expect(formatMoney(123_456, 'JMD')).toBe('$1,234.56')
  })

  it('renders USD with a US$ symbol so it is not read as a JMD amount', () => {
    expect(formatMoney(1_234, 'USD')).toBe('US$12.34')
  })

  it('renders JPY with no decimal places', () => {
    expect(formatMoney(123, 'JPY')).toBe('JP¥123')
  })

  it('renders BHD with three decimal places', () => {
    expect(formatMoney(1_234, 'BHD')).toBe('BHD\u00a01.234')
  })

  it('renders a null amount as an em dash', () => {
    expect(formatMoney(null, 'JMD')).toBe('—')
  })

  it('renders an undefined amount as an em dash', () => {
    expect(formatMoney(undefined, 'JMD')).toBe('—')
  })

  it('renders the raw amount when the currency is null', () => {
    expect(formatMoney(12_345, null)).toBe('12345')
  })

  it('renders the raw amount when the currency is undefined', () => {
    expect(formatMoney(12_345n, undefined)).toBe('12345')
  })

  it('renders an unsafe bigint as the code and the raw amount', () => {
    expect(formatMoney(9_007_199_254_740_992n, 'JMD')).toBe(
      'JMD 9007199254740992'
    )
  })

  it('renders a non-integer number as the code and the raw amount', () => {
    expect(formatMoney(12.5, 'JMD')).toBe('JMD 12.5')
  })

  it('renders an unreadable string as the code and the raw amount', () => {
    expect(formatMoney('not-a-number', 'JMD')).toBe('JMD not-a-number')
  })

  it('renders a minor amount given as a string', () => {
    expect(formatMoney('4900', 'JMD')).toBe('$49.00')
  })

  it('renders a minor amount given as a number', () => {
    expect(formatMoney(4900, 'JMD')).toBe('$49.00')
  })

  it('renders a minor amount given as a bigint', () => {
    expect(formatMoney(4900n, 'JMD')).toBe('$49.00')
  })

  it('normalises a lowercase currency code', () => {
    expect(formatMoney(4900, 'jmd')).toBe('$49.00')
  })

  it('renders a negative amount with the sign before the symbol', () => {
    expect(formatMoney(-250n, 'JMD')).toBe('-$2.50')
  })
})

describe('majorToMinor', () => {
  it('converts a two-decimal major amount exactly', () => {
    expect(majorToMinor('1500.00', 'JMD')).toBe(150_000n)
  })

  it('accepts a currency code in lowercase', () => {
    expect(majorToMinor('12.34', 'usd')).toBe(1_234n)
  })

  it('converts a whole amount on a zero-decimal currency', () => {
    expect(majorToMinor('12', 'JPY')).toBe(12n)
  })

  it('converts a three-decimal major amount exactly', () => {
    expect(majorToMinor('1.234', 'BHD')).toBe(1_234n)
  })

  it('trims surrounding whitespace', () => {
    expect(majorToMinor('  12.34  ', 'USD')).toBe(1_234n)
  })

  it('ignores leading zeros', () => {
    expect(majorToMinor('00012.34', 'USD')).toBe(1_234n)
  })

  it('accepts the largest safe minor-unit amount', () => {
    expect(majorToMinor('9007199254740991', 'JPY')).toBe(9_007_199_254_740_991n)
  })

  it('rejects more fraction digits than the currency carries', () => {
    expect(() => majorToMinor('1.001', 'USD')).toThrow(
      'USD supports 2 decimal places.'
    )
  })

  it('rejects any fraction on a zero-decimal currency', () => {
    expect(() => majorToMinor('1.5', 'JPY')).toThrow(
      'JPY supports 0 decimal places.'
    )
  })

  it('names the uppercase code in the fraction-digits error', () => {
    expect(() => majorToMinor('1.2345', 'jmd')).toThrow(
      'JMD supports 2 decimal places.'
    )
  })

  it('rejects a non-numeric string', () => {
    expect(() => majorToMinor('abc', 'USD')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects a negative amount', () => {
    expect(() => majorToMinor('-1.00', 'USD')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects a trailing decimal point', () => {
    expect(() => majorToMinor('12.', 'USD')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects an empty string', () => {
    expect(() => majorToMinor('', 'USD')).toThrow(
      'Enter a non-negative decimal amount.'
    )
  })

  it('rejects a result beyond safe-integer precision', () => {
    expect(() => majorToMinor('90071992547410', 'USD')).toThrow(
      'Amount is too large.'
    )
  })

  it('rejects a whole amount beyond safe-integer precision', () => {
    expect(() => majorToMinor('9007199254740992', 'JPY')).toThrow(
      'Amount is too large.'
    )
  })
})
