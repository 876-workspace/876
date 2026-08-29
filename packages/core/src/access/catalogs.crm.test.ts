import { describe, expect, it } from 'vitest'

import { crmPermissionCatalog } from './catalogs'

const moduleKeys = () =>
  crmPermissionCatalog.modules.map((module) => module.key)
const permissionKeys = () =>
  crmPermissionCatalog.permissions.map((permission) => permission.key)

describe('CRM permission catalog', () => {
  it('declares the complete schema-backed CRM module vocabulary', () => {
    // Sorted on both sides: the catalog preserves declaration order because
    // that is the order the modules render in, so asserting membership here
    // keeps this test about vocabulary completeness rather than about layout.
    expect([...moduleKeys()].sort()).toEqual([
      'categories',
      'customers',
      'notes',
      'priorities',
      'reminders',
      'reports',
      'request_forms',
      'requests',
      'settings',
      'tasks',
      'teams',
    ])
  })

  it('declares exactly 39 CRM capabilities', () => {
    expect(permissionKeys()).toHaveLength(39)
  })

  it('gives requests the exact CRUD capability set', () => {
    expect(
      crmPermissionCatalog.modules
        .find((module) => module.key === 'requests')
        ?.permissions.map((permission) => permission.key)
    ).toEqual([
      'requests.view',
      'requests.create',
      'requests.edit',
      'requests.delete',
    ])
  })

  it('gives reminders the exact CRUD capability set', () => {
    expect(
      permissionKeys().filter((key) => key.startsWith('reminders.'))
    ).toEqual([
      'reminders.create',
      'reminders.delete',
      'reminders.edit',
      'reminders.view',
    ])
  })

  it('gives notes the exact CRUD capability set', () => {
    expect(permissionKeys().filter((key) => key.startsWith('notes.'))).toEqual([
      'notes.create',
      'notes.delete',
      'notes.edit',
      'notes.view',
    ])
  })

  it('gives priorities the exact CRUD capability set', () => {
    expect(
      permissionKeys().filter((key) => key.startsWith('priorities.'))
    ).toEqual([
      'priorities.create',
      'priorities.delete',
      'priorities.edit',
      'priorities.view',
    ])
  })

  it('gives request forms the exact CRUD capability set', () => {
    expect(
      permissionKeys().filter((key) => key.startsWith('request_forms.'))
    ).toEqual([
      'request_forms.create',
      'request_forms.delete',
      'request_forms.edit',
      'request_forms.view',
    ])
  })

  it('keeps reports read-only', () => {
    expect(
      permissionKeys().filter((key) => key.startsWith('reports.'))
    ).toEqual(['reports.view'])
  })

  it('keeps settings limited to view and edit', () => {
    expect(
      permissionKeys().filter((key) => key.startsWith('settings.'))
    ).toEqual(['settings.edit', 'settings.view'])
  })

  it('emits only unique dot-delimited product-app keys', () => {
    const keys = permissionKeys()
    expect(new Set(keys).size).toBe(39)
    expect(keys.every((key) => /^[a-z_]+\.[a-z_]+$/.test(key))).toBe(true)
    expect(keys.some((key) => key.startsWith('console:'))).toBe(false)
  })
})
