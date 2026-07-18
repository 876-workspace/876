import { describe, expect, it } from 'vitest'

import { isActiveCouriersPath } from './couriers-nav-path'

describe('isActiveCouriersPath', () => {
  it.each([
    ['/org/island-logistics', '/org/island-logistics', true],
    ['/org/island-logistics/customers', '/org/island-logistics', false],
    [
      '/org/island-logistics/customers',
      '/org/island-logistics/customers',
      true,
    ],
    [
      '/org/island-logistics/customers/123',
      '/org/island-logistics/customers',
      true,
    ],
    [
      '/org/island-logistics/customer',
      '/org/island-logistics/customers',
      false,
    ],
    ['/org/island-logistics/customers', '#', false],
  ])('matches %s against %s as %s', (pathname, href, expected) => {
    expect(isActiveCouriersPath(pathname, href)).toBe(expected)
  })
})
