import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876Client } from './index.ts'
import { create876ServerClient } from './server.ts'
import {
  KNOWN_COLLISIONS,
  RESOURCE_MANIFEST,
  type CanonicalResource,
} from './resource-manifest.ts'

const API_KEY = '876_app_secret_test1234567890123456'

function consoleOptions() {
  return {
    app: 'console' as const,
    apiKey: API_KEY,
    internalKey: 'internal',
    services: {
      platformAdmin: { internalKey: 'internal', apiKey: API_KEY },
      billing: {
        integration: { internalKey: 'billing-internal' },
        admin: { internalKey: 'billing-internal' },
      },
      couriers: {
        admin: { internalKey: 'couriers-internal', apiKey: API_KEY },
      },
      storage: { internalKey: 'storage-internal' },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
        admin: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function couriersOptions() {
  return {
    app: 'couriers' as const,
    apiKey: API_KEY,
    services: {
      couriers: {
        client: { apiKey: API_KEY },
        admin: { internalKey: 'couriers-internal', apiKey: API_KEY },
      },
      storage: { internalKey: 'storage-internal' },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function billingOptions() {
  return {
    app: 'billing' as const,
    apiKey: API_KEY,
    services: {
      billing: { tenant: { baseUrl: 'http://localhost:4004' } },
      widgets: {
        member: { baseUrl: 'http://localhost:4003', serviceKey: 'widgets-key' },
      },
    },
  }
}

function has(surface: unknown, key: string): boolean {
  return typeof surface === 'object' && surface !== null && key in surface
}

describe('resource ownership manifest', () => {
  it('gives every canonical resource an owner and a meaning', () => {
    for (const [name, entry] of Object.entries(RESOURCE_MANIFEST)) {
      expect(entry.owner, `${name}.owner`).toBeTruthy()
      expect(entry.meaning.length, `${name}.meaning`).toBeGreaterThan(0)
    }
  })

  it('records exactly the known facade namespace collision (products only)', () => {
    expect(KNOWN_COLLISIONS.map((c) => c.resource)).toEqual(['products'])
  })

  it('only records collisions for resources that exist in the manifest', () => {
    for (const collision of KNOWN_COLLISIONS) {
      const resource = collision.resource as CanonicalResource
      expect(RESOURCE_MANIFEST[resource]).toBeDefined()
      expect(RESOURCE_MANIFEST[resource].owner).toBe(collision.canonicalOwner)
    }
  })
})

describe('platform surface completeness (regression guard for #255/#256)', () => {
  it('exposes the resources whose omission broke Cloudflare builds', () => {
    const $876 = create876ServerClient({ app: '876', apiKey: API_KEY })

    // #256 casualty
    expect($876.oauthGrants.list).toBeTypeOf('function')
    expect($876.oauthGrants.revoke).toBeTypeOf('function')
    // #255 casualties
    expect($876.auditEvents.create).toBeTypeOf('function')
    expect($876.products.list).toBeTypeOf('function')
    // entitlements is the core noun, must never revert to `subscriptions`
    expect($876.entitlements.list).toBeTypeOf('function')
    // self-scoped user resources that were present in the SDK but missing from
    // the composed surface (same omission class as #255/#256)
    expect($876.mobileNumbers.list).toBeTypeOf('function')
    expect($876.mobileNumberVerifications.create).toBeTypeOf('function')
  })

  it('exposes core identity on every server app surface', () => {
    const surfaces = [
      create876ServerClient(consoleOptions()),
      create876ServerClient(couriersOptions()),
      create876ServerClient(billingOptions()),
      create876ServerClient({ app: 'enterprise', apiKey: API_KEY }),
    ]
    for (const $876 of surfaces) {
      expect($876.auth).toBeDefined()
      expect($876.users.me).toBeDefined()
      expect($876.organizations).toBeDefined()
      expect($876.apps).toBeDefined()
      expect($876.entitlements).toBeDefined()
    }
  })
})

describe('per-app resource boundaries (no cross-app leakage)', () => {
  it('billing exposes finance resources and never courier resources', () => {
    const $876 = create876ServerClient(billingOptions())
    expect($876.invoices).toBeDefined()
    expect($876.payments).toBeDefined()
    expect($876.customers).toBeDefined()
    expect($876.subscriptions).toBeDefined()
    expect(has($876, 'packages')).toBe(false)
    expect(has($876, 'branches')).toBe(false)
  })

  it('couriers exposes logistics resources and never billing documents', () => {
    const $876 = create876ServerClient(couriersOptions())
    expect($876.packages).toBeDefined()
    expect($876.mailboxes).toBeDefined()
    expect($876.customers).toBeDefined()
    expect(has($876, 'invoices')).toBe(false)
    expect(has($876, 'payments')).toBe(false)
    expect(has($876, 'subscriptions')).toBe(false)
  })
})

describe('browser surface never leaks server-only resources', () => {
  it('omits storage, billing documents, courier logistics and admin', () => {
    const browser = create876Client()
    for (const forbidden of [
      'files',
      'uploads',
      'packages',
      'invoices',
      'payments',
      'products',
      'storage',
      'billing',
      'couriers',
      'admin',
    ]) {
      expect(has(browser, forbidden), `browser.${forbidden}`).toBe(false)
    }
  })

  it('accepts an app id without forwarding it to the strict SDK options schema', () => {
    // Regression: the SDK parses options with z.strictObject, so forwarding an
    // unknown `app` key made create876Client({ app }) throw at runtime.
    expect(() => create876Client({ app: 'console' })).not.toThrow()
    const browser = create876Client({ app: 'enterprise' })
    expect(browser.auth).toBeDefined()
    expect(has(browser, 'app')).toBe(false)
  })
})
