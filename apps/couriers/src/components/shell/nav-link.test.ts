import { describe, expect, it } from 'vitest'

import { isActivePath } from './nav-path'

describe('isActivePath', () => {
  it.each([
    ['/island-logistics', '/island-logistics', true],
    ['/island-logistics/customers', '/island-logistics', false],
    ['/island-logistics/customers', '/island-logistics/customers', true],
    ['/island-logistics/customers/123', '/island-logistics/customers', true],
    ['/island-logistics/customer', '/island-logistics/customers', false],
    ['/island-logistics/customers', '#', false],
  ])('matches %s against %s as %s', (pathname, href, expected) => {
    expect(isActivePath(pathname, href)).toBe(expected)
  })
})
