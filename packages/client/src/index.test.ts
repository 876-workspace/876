import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876Client } from './index.ts'
import { create876ServerClient } from './server.ts'

describe('unified $876 resource model', () => {
  it('does not expose product namespaces', () => {
    const $876 = create876ServerClient({
      app: 'console',
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: 'internal',
    }) as unknown as Record<string, unknown>
    expect('billing' in $876).toBe(false)
    expect('couriers' in $876).toBe(false)
    expect('storage' in $876).toBe(false)
    expect('widgets' in $876).toBe(false)
    expect('admin' in $876).toBe(false)
    expect('couriersAdmin' in $876).toBe(false)
    expect('productsCatalog' in $876).toBe(false)
  })

  it('server client requires an app context', () => {
    // @ts-expect-error app is required
    create876ServerClient({ apiKey: '876_app_secret_test1234567890123456' })
  })

  it('browser client has no server-only/privileged resources', () => {
    const browser = create876Client({}) as unknown as Record<string, unknown>
    expect('files' in browser).toBe(false)
    expect('uploads' in browser).toBe(false)
    expect('packages' in browser).toBe(false)
    expect('invoices' in browser).toBe(false)
    expect('products' in browser).toBe(false)
    expect('admin' in browser).toBe(false)
    // users has me but not admin in browser
    expect(
      (browser.users as unknown as { admin?: unknown }).admin
    ).toBeUndefined()
    expect(
      (browser.apps as unknown as { admin?: unknown }).admin
    ).toBeUndefined()
  })

  it('server users has me and admin only when platformAdmin configured', () => {
    const $876 = create876ServerClient({
      app: 'console',
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: '876_app_secret_test1234567890123456',
    })
    expect($876.users.me).toBeDefined()
    const usersAdmin = ($876.users as unknown as { admin?: unknown }).admin
    expect(usersAdmin).toBeDefined()
    expect($876.users.me.retrieve).toBeDefined()
    // no admin spread onto users root
    expect(
      ($876.users as unknown as { list?: unknown }).list
    ).toBeUndefined()
  })

  it('server apps/organizations/features have admin under .admin, not spread', () => {
    const $876 = create876ServerClient({
      app: 'console',
      apiKey: '876_app_secret_test1234567890123456',
      internalKey: '876_app_secret_test1234567890123456',
    })
    expect(
      ($876.apps as unknown as { admin?: unknown }).admin
    ).toBeDefined()
    expect(
      ($876.organizations as unknown as { admin?: unknown }).admin
    ).toBeDefined()
    expect(
      ($876.features as unknown as { admin?: unknown }).admin
    ).toBeDefined()
    // root methods are the normal (self-scoped) surface
    expect(
      ($876.apps as unknown as { list: unknown }).list
    ).toBeDefined()
  })

  it('entitlements maps to platform subscriptions', () => {
    const $876 = create876ServerClient({
      app: 'console',
      apiKey: '876_app_secret_test1234567890123456',
    })
    expect($876.entitlements).toBeDefined()
    expect($876.entitlements.list).toBeDefined()
  })
})

describe('create876Client browser', () => {
  it('composes platform safely', () => {
    const $876 = create876Client({ fetch: vi.fn() as unknown as typeof fetch })
    expect($876.auth).toBeDefined()
    expect($876.organizations).toBeDefined()
    expect($876.users.me).toBeDefined()
    expect($876.notes).toBeDefined()
    expect($876.collections).toBeDefined()
  })

  it('does not leak server secrets to browser', () => {
    const $876 = create876Client() as unknown as Record<string, unknown>
    expect('storage' in $876).toBe(false)
    expect('admin' in $876).toBe(false)
    expect('billing' in $876).toBe(false)
    expect('couriers' in $876).toBe(false)
  })
})
