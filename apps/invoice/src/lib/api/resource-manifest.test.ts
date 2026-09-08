import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  isProxiedResource,
  PROXIED_RESOURCES,
} from '@/lib/api/resource-manifest'

const API_ROOT = fileURLToPath(new URL('../../app/api', import.meta.url))

describe('Invoice proxied resource manifest', () => {
  it('exactly matches the resource proxy route tree', () => {
    const routeResources = readdirSync(API_ROOT, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(API_ROOT, entry.name, '[[...path]]', 'route.ts'))
      )
      .map((entry) => entry.name)

    expect(new Set(PROXIED_RESOURCES)).toEqual(new Set(routeResources))
  })

  it('is alphabetically sorted', () => {
    expect([...PROXIED_RESOURCES]).toEqual([...PROXIED_RESOURCES].sort())
  })

  it('is frozen', () => {
    expect(Object.isFrozen(PROXIED_RESOURCES)).toBe(true)
  })

  it('has no duplicates', () => {
    expect(new Set(PROXIED_RESOURCES).size).toBe(PROXIED_RESOURCES.length)
  })

  it('recognizes every declared resource', () => {
    expect(PROXIED_RESOURCES.every(isProxiedResource)).toBe(true)
  })

  it('accepts quotes as an explicitly declared resource', () => {
    expect(isProxiedResource('quotes')).toBe(true)
  })

  it('rejects an unlisted resource', () => {
    expect(isProxiedResource('subscriptions')).toBe(false)
  })

  it.each(['admin', 'internal', '..', ''])('rejects non-member %j', (value) => {
    expect(isProxiedResource(value)).toBe(false)
  })
})
