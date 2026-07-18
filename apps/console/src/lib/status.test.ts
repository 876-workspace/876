import { describe, expect, it } from 'vitest'

import { APP_STATUSES, isAppStatus } from './app-status'
import { isOrgStatus, ORG_STATUSES } from './org-status'
import { isUserStatus, USER_STATUSES } from './user-status'

const INVALID_STATUS_VALUES = [
  '',
  'ACTIVE',
  'pending',
  0,
  false,
  null,
  undefined,
  {},
  [],
] as const

describe('app status', () => {
  it('publishes every supported app status in contract order', () => {
    expect(APP_STATUSES).toEqual(['active', 'inactive'])
  })

  it.each(APP_STATUSES)('accepts %s', (status) => {
    expect(isAppStatus(status)).toBe(true)
  })

  it.each(INVALID_STATUS_VALUES)('rejects invalid value %j', (value) => {
    expect(isAppStatus(value)).toBe(false)
  })
})

describe('organization status', () => {
  it('publishes every supported organization status in contract order', () => {
    expect(ORG_STATUSES).toEqual(['active', 'suspended', 'archived'])
  })

  it.each(ORG_STATUSES)('accepts %s', (status) => {
    expect(isOrgStatus(status)).toBe(true)
  })

  it.each(INVALID_STATUS_VALUES)('rejects invalid value %j', (value) => {
    expect(isOrgStatus(value)).toBe(false)
  })
})

describe('user status', () => {
  it('publishes every supported user status in contract order', () => {
    expect(USER_STATUSES).toEqual(['active', 'inactive', 'suspended'])
  })

  it.each(USER_STATUSES)('accepts %s', (status) => {
    expect(isUserStatus(status)).toBe(true)
  })

  it.each(INVALID_STATUS_VALUES)('rejects invalid value %j', (value) => {
    expect(isUserStatus(value)).toBe(false)
  })
})
