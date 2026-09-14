import { describe, expect, it } from 'vitest'
import { navConfig } from './nav-config'
describe('Commerce navigation', () => {
  it('has one Home entry', () => expect(navConfig[0]?.entries).toHaveLength(1))
  it('routes Home to the root', () =>
    expect(navConfig[0]?.entries[0]?.href).toBe('/'))
  it('does not attach an unnecessary permission to Home', () =>
    expect(navConfig[0]?.entries[0]?.requires).toBeUndefined())
})
