import { describe, expect, it } from 'vitest'

import { appPermissionCatalogs, commercePermissionCatalog } from './catalogs'

describe('commercePermissionCatalog', () => {
  it('declares the app slug as exactly 876-commerce', () => {
    expect(commercePermissionCatalog.app).toBe('876-commerce')
  })

  it('declares Settings as its only module', () => {
    expect(commercePermissionCatalog.modules.map((module) => module.key)).toEqual([
      'settings',
    ])
  })

  it('declares only settings.view and settings.edit', () => {
    expect(
      commercePermissionCatalog.permissions.map((permission) => permission.key)
    ).toEqual(['settings.edit', 'settings.view'])
  })

  it('registers the catalog under 876-commerce', () => {
    expect(appPermissionCatalogs['876-commerce']).toBe(commercePermissionCatalog)
  })
})
