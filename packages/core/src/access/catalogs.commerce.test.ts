import { describe, expect, it } from 'vitest'

import { COMMERCE_MODULES } from '../modules'
import { appPermissionCatalogs, commercePermissionCatalog } from './catalogs'

describe('commercePermissionCatalog', () => {
  it('declares the app slug as exactly 876-commerce', () => {
    expect(commercePermissionCatalog.app).toBe('876-commerce')
  })

  it('declares capability and subdomain permission groups in stable order', () => {
    expect(commercePermissionCatalog.modules.map((module) => module.key)).toEqual([
      'dashboard',
      'catalog',
      'products',
      'collections',
      'orders',
      'customers',
      'inventory',
      'storefront',
      'themes',
      'domains',
      'checkout',
      'payments',
      'discounts',
      'shipping',
      'fulfillment',
      'returns',
      'markets',
      'marketing',
      'analytics',
      'pos',
      'b2b',
      'subscriptions',
      'channels',
      'automation',
      'settings',
    ])
  })

  it('reuses canonical identity where permission and module semantics match', () => {
    const modules = new Map(
      commercePermissionCatalog.modules.map((module) => [module.key, module])
    )

    expect(modules.get('catalog')?.label).toBe(COMMERCE_MODULES.catalog.label)
    expect(modules.get('orders')?.label).toBe(COMMERCE_MODULES.orders.label)
    expect(modules.get('inventory')?.label).toBe(
      COMMERCE_MODULES.inventory.label
    )
    expect(modules.get('storefront')?.label).toBe(
      COMMERCE_MODULES.storefront.label
    )
  })

  it('keeps storefront subdomains as permissions instead of commercial modules', () => {
    const permissionModules = commercePermissionCatalog.modules.map(
      (module) => module.key
    )
    const canonicalModules = new Set(Object.values(COMMERCE_MODULES).map((m) => m.key))

    expect(permissionModules).toContain('themes')
    expect(permissionModules).toContain('domains')
    expect(canonicalModules.has('themes')).toBe(false)
    expect(canonicalModules.has('domains')).toBe(false)
  })

  it('declares domain-specific order and inventory actions', () => {
    const keys = new Set(
      commercePermissionCatalog.permissions.map((permission) => permission.key)
    )

    expect([...keys].filter((key) => key.startsWith('orders.')).sort()).toEqual([
      'orders.cancel',
      'orders.create',
      'orders.edit',
      'orders.fulfill',
      'orders.refund',
      'orders.view',
    ])
    expect(
      [...keys].filter((key) => key.startsWith('inventory.')).sort()
    ).toEqual(['inventory.adjust', 'inventory.transfer', 'inventory.view'])
  })

  it('marks destructive CRUD permissions dangerous without treating workflow actions as deletes', () => {
    const byKey = new Map(
      commercePermissionCatalog.permissions.map((permission) => [
        permission.key,
        permission,
      ])
    )

    expect(byKey.get('products.delete')?.isDangerous).toBe(true)
    expect(byKey.get('collections.delete')?.isDangerous).toBe(true)
    expect(byKey.get('orders.cancel')?.isDangerous).toBe(false)
    expect(byKey.get('orders.refund')?.isDangerous).toBe(false)
  })

  it('registers the catalog under 876-commerce', () => {
    expect(appPermissionCatalogs['876-commerce']).toBe(commercePermissionCatalog)
  })
})
