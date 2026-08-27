import { describe, expect, it } from 'vitest'

import { APP_ACCESS_SEED_DEFINITIONS } from './app-access'

const KEY = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

function app(slug: string) {
  const definition = APP_ACCESS_SEED_DEFINITIONS.find(
    (candidate) => candidate.appSlug === slug
  )
  if (!definition) throw new Error(`Missing seed definition for ${slug}.`)
  return definition
}

describe('app access seed catalog', () => {
  it('does not create an app-role plane for 876 Enterprise', () => {
    expect(
      APP_ACCESS_SEED_DEFINITIONS.some(
        (definition) => definition.appSlug === '876-enterprise'
      )
    ).toBe(false)
  })

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug declares exactly one least-privileged default role',
    (definition) => {
      const defaults = definition.roles.filter((role) => role.isDefault)
      expect(defaults).toHaveLength(1)
      expect(defaults[0]!.key).not.toBe('admin')
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug permission keys are unique and permanent-format compatible',
    (definition) => {
      const keys = definition.permissions.map((permission) => permission.key)
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys.every((key) => KEY.test(key))).toBe(true)
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug role permissions are subsets of its declared catalog',
    (definition) => {
      const catalog = new Set(
        definition.permissions.map((permission) => permission.key)
      )
      for (const role of definition.roles)
        expect(role.permissions.every((permission) => catalog.has(permission))).toBe(
          true
        )
    }
  )

  it('ports every Couriers module and extra permission', () => {
    expect(app('876-couriers').permissions.map((permission) => permission.key)).toEqual([
      'items.view',
      'items.create',
      'items.edit',
      'items.delete',
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'customers.import',
      'customers.export',
      'packages.view',
      'packages.create',
      'packages.edit',
      'packages.delete',
      'packages.export',
      'pre_alerts.view',
      'pre_alerts.create',
      'pre_alerts.edit',
      'pre_alerts.delete',
      'warehouse.view',
      'warehouse.create',
      'warehouse.edit',
      'warehouse.delete',
      'manifests.view',
      'manifests.create',
      'manifests.edit',
      'manifests.delete',
      'deliveries.view',
      'deliveries.create',
      'deliveries.edit',
      'deliveries.delete',
      'invoices.view',
      'invoices.create',
      'invoices.edit',
      'invoices.delete',
      'payments.view',
      'payments.create',
      'payments.edit',
      'payments.delete',
      'reports.view',
      'settings.view',
      'settings.edit',
    ])
  })

  it('keeps Couriers staff away from Reports and Settings', () => {
    const staff = app('876-couriers').roles.find((role) => role.key === 'staff')
    expect(staff?.permissions.some((permission) => permission.startsWith('reports.'))).toBe(
      false
    )
    expect(staff?.permissions.some((permission) => permission.startsWith('settings.'))).toBe(
      false
    )
  })

  it('defines the CRM role vocabulary from most to least privileged', () => {
    expect(app('876-crm').roles.map((role) => role.key)).toEqual([
      'admin',
      'manager',
      'agent',
      'viewer',
    ])
  })

  it.each(['876-billing', '876-invoice'])(
    '%s exposes admin, finance_manager and viewer templates',
    (slug) => {
      expect(app(slug).roles.map((role) => role.key)).toEqual([
        'admin',
        'finance_manager',
        'viewer',
      ])
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug admin receives the complete declared catalog',
    (definition) => {
      const admin = definition.roles.find((role) => role.key === 'admin')
      expect(admin?.permissions).toEqual(
        definition.permissions.map((permission) => permission.key)
      )
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug system templates are marked platform-managed',
    (definition) => {
      expect(definition.roles.every((role) => role.isSystem)).toBe(true)
    }
  )
})
