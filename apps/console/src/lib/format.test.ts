import { describe, expect, it } from 'vitest'

import {
  accountTypeBadgeClass,
  accountTypeBadgeVariant,
  membershipStatusBadgeVariant,
  statusBadgeClass,
  statusBadgeVariant,
} from './format'

describe('Console format helpers', () => {
  it('maps account type variants and classes', () => {
    expect(accountTypeBadgeVariant('enterprise')).toBe('default')
    expect(accountTypeBadgeVariant('consumer')).toBe('secondary')
    expect(accountTypeBadgeClass('enterprise')).toContain('amber')
    expect(accountTypeBadgeClass('consumer')).toContain('sky')
    expect(accountTypeBadgeClass('unknown')).toContain('sky')
  })

  it('maps status variants and classes', () => {
    expect(statusBadgeVariant('active')).toBe('secondary')
    expect(statusBadgeVariant('suspended')).toBe('destructive')
    expect(statusBadgeVariant('inactive')).toBe('destructive')
    expect(statusBadgeVariant('pending')).toBe('outline')

    expect(statusBadgeClass('active')).toContain('emerald')
    expect(statusBadgeClass('suspended')).toContain('amber')
    expect(statusBadgeClass('inactive')).toContain('slate')
    expect(statusBadgeClass('banned')).toContain('red')
    expect(statusBadgeClass('pending')).toContain('muted')
  })

  it('maps membership status variants', () => {
    expect(membershipStatusBadgeVariant('active')).toBe('secondary')
    expect(membershipStatusBadgeVariant('invited')).toBe('default')
    expect(membershipStatusBadgeVariant('suspended')).toBe('destructive')
    expect(membershipStatusBadgeVariant('removed')).toBe('destructive')
    expect(membershipStatusBadgeVariant('pending')).toBe('outline')
  })
})
