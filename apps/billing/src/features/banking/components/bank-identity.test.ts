import { describe, expect, it } from 'vitest'

import { bankInitials, formatAccountNumber } from './bank-identity'

describe('formatAccountNumber', () => {
  it('renders transit and the masked last four together', () => {
    expect(formatAccountNumber('00412', '1234')).toBe('00412 · ••••1234')
  })

  it('renders only the transit when no last four is stored', () => {
    expect(formatAccountNumber('00412', null)).toBe('00412')
  })

  it('renders only the masked last four when no transit is known', () => {
    expect(formatAccountNumber(null, '1234')).toBe('••••1234')
  })

  it('renders an em dash when nothing is known', () => {
    expect(formatAccountNumber(null, null)).toBe('—')
    expect(formatAccountNumber(undefined, undefined)).toBe('—')
  })
})

describe('bankInitials', () => {
  it('derives the monogram from the short name', () => {
    expect(bankInitials('National Commercial Bank', 'NCB')).toBe('NC')
  })

  it('falls back to word initials from the full name', () => {
    expect(bankInitials('Bank of Nova Scotia')).toBe('BO')
  })

  it('renders a placeholder when no name is available', () => {
    expect(bankInitials(null)).toBe('?')
    expect(bankInitials('   ', null)).toBe('?')
  })
})
