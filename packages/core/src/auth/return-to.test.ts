import { describe, expect, it } from 'vitest'

import {
  createAuthLoginPath,
  createReturnToPath,
  resolveRelativeReturnTo,
} from './return-to'

describe('auth return-to helpers', () => {
  it('builds the standard embedded login path', () => {
    expect(createAuthLoginPath('/customers?status=active')).toBe(
      '/login?returnTo=%2Fcustomers%3Fstatus%3Dactive'
    )
  })

  it('resolves safe relative return paths', () => {
    expect(resolveRelativeReturnTo('/settings')).toBe('/settings')
    expect(createReturnToPath('/settings', '?tab=profile')).toBe(
      '/settings?tab=profile'
    )
  })

  it.each(['https://example.com', '//example.com', '/login'])(
    'falls back for unsafe or blocked return path %s',
    (value) => {
      expect(resolveRelativeReturnTo(value)).toBe('/')
    }
  )
})
