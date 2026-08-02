import { describe, expect, it } from 'vitest'

import { isActivePath } from './nav-path'

describe('isActivePath', () => {
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
    expect(isActivePath(pathname, href)).toBe(expected)
  })
})
