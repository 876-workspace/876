import { describe, expect, it } from 'vitest'

import { APP_ACCESS_SEED_DEFINITIONS } from './app-access'

const KEY = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/
const ROLE_KEY = /^[a-z][a-z0-9-]*$/

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
      expect(defaults[0]!.key).toBe('staff')
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug permission keys are unique and canonical kebab/dot format',
    (definition) => {
      const keys = definition.permissions.map((permission) => permission.key)
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys.every((key) => KEY.test(key))).toBe(true)
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug system role keys use canonical kebab-case',
    (definition) => {
      expect(definition.roles.every((role) => ROLE_KEY.test(role.key))).toBe(true)
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug role permissions are subsets of its declared catalog',
    (definition) => {
      const catalog = new Set(
        definition.permissions.map((permission) => permission.key)
      )
      for (const role of definition.roles)
        expect(
          role.permissions.every((permission) => catalog.has(permission))
        ).toBe(true)
    }
  )

  it('ports every Couriers module and extra permission', () => {
    expect(
      app('876-couriers').permissions.map((permission) => permission.key)
    ).toEqual([
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
      'pre-alerts.view',
      'pre-alerts.create',
      'pre-alerts.edit',
      'pre-alerts.delete',
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

  it('keeps Couriers staff read-only in Reports and Settings', () => {
    const staff = app('876-couriers').roles.find((role) => role.key === 'staff')
    expect(
      staff?.permissions.filter((permission) => permission.startsWith('reports.'))
    ).toEqual(['reports.view'])
    expect(
      staff?.permissions.filter((permission) => permission.startsWith('settings.'))
    ).toEqual(['settings.view'])
  })

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug uses the shared role vocabulary and order',
    (definition) => {
      expect(definition.roles.map((role) => role.key)).toEqual([
        'super-admin',
        'admin',
        'staff',
      ])
      expect(definition.roles.map((role) => role.position)).toEqual([0, 10, 20])
    }
  )

  it('grants every Console CRM mutation requirement to a named system role', () => {
    const surfaceRequirements = [
      'requests.create',
      'requests.edit',
      'requests.delete',
      'notes.create',
      'notes.edit',
      'notes.delete',
      'tasks.create',
      'tasks.edit',
      'tasks.delete',
      'reminders.create',
      'reminders.edit',
      'reminders.delete',
    ]
    const roles = app('876-crm').roles

    expect(
      surfaceRequirements.filter(
        (permission) =>
          !roles.some((role) => role.permissions.includes(permission))
      )
    ).toEqual([])
  })

  it('grants Invoice Work reads to staff and non-destructive writes to admin', () => {
    const roles = app('876-invoice').roles
    const admin = roles.find((role) => role.key === 'admin')
    const staff = roles.find((role) => role.key === 'staff')

    expect(staff?.permissions).toEqual(
      expect.arrayContaining([
        'tasks.view',
        'reminders.view',
        'events.view',
        'calendars.view',
        'my-work.view',
      ])
    )
    expect(admin?.permissions).toEqual(
      expect.arrayContaining([
        'tasks.create',
        'tasks.edit',
        'reminders.create',
        'reminders.edit',
        'events.create',
        'events.edit',
        'calendars.create',
        'calendars.edit',
      ])
    )
    expect(
      admin?.permissions.some(
        (permission) =>
          permission.startsWith('tasks.') && permission.endsWith('.delete')
      )
    ).toBe(false)
  })

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug super admin receives the complete declared catalog',
    (definition) => {
      const superAdmin = definition.roles.find(
        (role) => role.key === 'super-admin'
      )
      expect(superAdmin?.permissions).toEqual(
        definition.permissions.map((permission) => permission.key)
      )
    }
  )

  it.each(APP_ACCESS_SEED_DEFINITIONS)(
    '$appSlug admin cannot delete and staff is read-only',
    (definition) => {
      const admin = definition.roles.find((role) => role.key === 'admin')
      const staff = definition.roles.find((role) => role.key === 'staff')
      expect(admin?.permissions.some((key) => key.endsWith('.delete'))).toBe(
        false
      )
      expect(staff?.permissions.every((key) => key.endsWith('.view'))).toBe(
        true
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
