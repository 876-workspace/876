import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876Client } from './index.ts'
import { create876ServerClient } from './server.ts'

describe('unified $876 resource model', () => {
  it('does not expose product namespaces', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: 'internal',
      services: {
        billing: {
          baseUrl: 'http://billing',
          apiKey: '876_app_secret_test1234567890123456',
        } as never,
        couriers: {
          baseUrl: 'http://couriers',
          apiKey: '876_app_secret_test1234567890123456',
          internalKey: '876_app_secret_test1234567890123456',
        } as never,
        storage: {
          internalKey: '876_app_secret_test1234567890123456',
        } as never,
        widgets: {
          baseUrl: 'http://widgets',
          serviceKey: '876_app_secret_test1234567890123456',
        } as never,
      },
    }) as unknown as Record<string, unknown>
    expect('billing' in $876).toBe(false)
    expect('couriers' in $876).toBe(false)
    expect('storage' in $876).toBe(false)
    expect('widgets' in $876).toBe(false)
    expect('admin' in $876).toBe(false)
    expect('couriersAdmin' in $876).toBe(false)
  })

  it('exposes Billing resources at root', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      services: {
        billing: {
          baseUrl: 'http://billing',
          apiKey: '876_app_secret_test1234567890123456',
        } as never,
      },
    })
    expect($876.customers).toBeDefined()
    expect($876.invoices).toBeDefined()
    expect($876.payments).toBeDefined()
    expect($876.subscriptions).toBeDefined()
    expect($876.products).toBeDefined()
    expect($876.plans).toBeDefined()
    expect($876.prices).toBeDefined()
  })

  it('exposes Couriers resources at root', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      services: {
        couriers: {
          baseUrl: 'http://couriers',
          apiKey: '876_app_secret_test1234567890123456',
          internalKey: '876_app_secret_test1234567890123456',
        } as never,
      },
    })
    expect($876.packages).toBeDefined()
    expect($876.branches).toBeDefined()
    expect($876.warehouses).toBeDefined()
    expect($876.mailboxes).toBeDefined()
  })

  it('exposes Storage resources at root', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      services: {
        storage: {
          internalKey: '876_app_secret_test1234567890123456',
        } as never,
      },
    })
    expect($876.files).toBeDefined()
    expect($876.uploads).toBeDefined()
  })

  it('exposes Widgets resources at root', () => {
    const $876 = create876Client({})
    expect($876.notes).toBeDefined()
    expect($876.collections).toBeDefined()
  })

  it('browser client does not expose admin', () => {
    const $876 = create876Client({}) as unknown as Record<string, unknown>
    expect('admin' in $876).toBe(false)
    // users should have me but not admin in browser
    expect(($876.users as unknown as { admin?: unknown }).admin).toBeUndefined()
    expect(($876.apps as unknown as { admin?: unknown }).admin).toBeUndefined()
  })

  it('server users has me and admin', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: '876_app_secret_test1234567890123456',
    })
    expect($876.users.me).toBeDefined()
    expect(($876.users as unknown as { admin: unknown }).admin).toBeDefined()
    expect($876.users.me.retrieve).toBeDefined()
  })

  it('server apps has admin', () => {
    const $876 = create876ServerClient({
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: '876_app_secret_test1234567890123456',
    })
    expect($876.apps).toBeDefined()
    expect(($876.apps as unknown as { admin: unknown }).admin).toBeDefined()
  })
})

describe('create876Client browser', () => {
  it('composes platform safely', () => {
    const $876 = create876Client({ fetch: vi.fn() as unknown as typeof fetch })
    expect($876.auth).toBeDefined()
    expect($876.organizations).toBeDefined()
    expect($876.users.me).toBeDefined()
  })
  it('does not leak server secrets to browser', () => {
    const $876 = create876Client() as unknown as Record<string, unknown>
    expect('storage' in $876).toBe(false)
    expect('admin' in $876).toBe(false)
    expect('billing' in $876).toBe(false)
    expect('couriers' in $876).toBe(false)
  })
})
