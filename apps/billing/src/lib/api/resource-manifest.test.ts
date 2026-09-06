import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  isProxiedResource,
  PROXIED_RESOURCES,
} from '@/lib/api/resource-manifest'

const API_ROOT = fileURLToPath(new URL('../../app/api', import.meta.url))

describe('Billing proxied resource manifest', () => {
  it('exactly matches the resource proxy route tree', () => {
    // Membership is defined by actually delegating to the generic proxy, not by
    // the `[[...path]]` file shape: a hand-written typed dispatcher (accounting
    // providers) uses the same shape but must never be listed as proxied.
    const routeResources = readdirSync(API_ROOT, { withFileTypes: true })
      .filter((entry) => {
        if (!entry.isDirectory()) return false
        const routeFile = join(API_ROOT, entry.name, '[[...path]]', 'route.ts')
        if (!existsSync(routeFile)) return false
        const source = readFileSync(routeFile, 'utf8')
        return (
          source.includes('createBillingResourceRoute') ||
          source.includes('proxyBillingResourceRequest')
        )
      })
      .map((entry) => entry.name)

    expect(new Set(PROXIED_RESOURCES)).toEqual(new Set(routeResources))
  })

  it('excludes a typed dispatcher that shares the catch-all route shape', () => {
    // Regression anchor: accounting providers authorize and call named SDK
    // operations. Listing it here would claim a generic passthrough exists.
    expect(isProxiedResource('accounting-providers')).toBe(false)
    expect(
      existsSync(
        join(API_ROOT, 'accounting-providers', '[[...path]]', 'route.ts')
      )
    ).toBe(true)
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

  it.each(['admin', 'internal', '..', ''])('rejects non-member %j', (value) => {
    expect(isProxiedResource(value)).toBe(false)
  })
})
