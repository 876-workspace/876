import { couriersPermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import { PERMISSION_CATALOG, allPermissionKeys } from './catalog'

/**
 * The identity API seeds `app_permissions` from
 * `@876/core/access/catalogs`, and every effective permission set is
 * intersected with those seeded rows. A key that exists only in this app's
 * local catalog can therefore be granted in the Couriers role editor and then
 * silently dropped at resolution time, which reads as a permission that does
 * nothing rather than as an error.
 *
 * These assertions are the only thing keeping the two definitions equal until
 * the local catalog is replaced by the shared one outright — see
 * `docs/architecture/012-app-access-wiring-contract.md`.
 */
describe('couriers permission catalog', () => {
  it('declares exactly the permission keys the platform catalog seeds', () => {
    const local = [...allPermissionKeys(PERMISSION_CATALOG)].sort()
    const platform = couriersPermissionCatalog.permissions
      .map((permission) => permission.key)
      .sort()

    expect(local).toEqual(platform)
  })

  it('declares exactly the modules the platform catalog seeds, in the same order', () => {
    expect(PERMISSION_CATALOG.map((module) => module.key)).toEqual(
      couriersPermissionCatalog.modules.map((module) => module.key)
    )
  })

  it('agrees with the platform catalog on each module label', () => {
    const platformLabels = new Map(
      couriersPermissionCatalog.modules.map((module) => [
        module.key,
        module.label,
      ])
    )

    for (const module of PERMISSION_CATALOG)
      expect(module.label).toBe(platformLabels.get(module.key))
  })

  it('orders each module’s permissions the same way the platform catalog does', () => {
    for (const module of couriersPermissionCatalog.modules) {
      const local = PERMISSION_CATALOG.find((row) => row.key === module.key)
      expect(local).toBeDefined()
      expect([
        ...local!.actions,
        ...local!.extras.map((extra) => extra.key),
      ]).toEqual(module.permissions.map((permission) => permission.action))
    }
  })
})
