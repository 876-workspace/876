import { describe, expect, it } from 'vitest'

import { isActiveEnterprisePath } from './enterprise-nav-link'

describe('isActiveEnterprisePath', () => {
  it.each([
    ['/acme', '/acme', true],
    ['/acme/members', '/acme', false],
    ['/acme/members', '/acme/members', true],
    ['/acme/members/123', '/acme/members', true],
    ['/acme/member', '/acme/members', false],
    ['https://app.example.com', 'https://app.example.com', true],
    ['/acme', 'https://app.example.com', false],
  ])('matches %s against %s as %s', (pathname, href, expected) => {
    expect(isActiveEnterprisePath(pathname, href)).toBe(expected)
  })
})
