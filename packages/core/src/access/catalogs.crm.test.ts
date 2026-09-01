import { describe, expect, it } from 'vitest'

import { crmPermissionCatalog } from './catalogs'

const moduleKeys = () =>
  crmPermissionCatalog.modules.map((module) => module.key)
const permissionKeys = () =>
  crmPermissionCatalog.permissions.map((permission) => permission.key)

describe('CRM permission catalog', () => {
  it('declares the complete schema-backed CRM module vocabulary', () => {
    expect([...moduleKeys()].sort()).toEqual([
      'calendars',
      'categories',
      'customers',
      'events',
      'my-work',
      'notes',
      'priorities',
      'reminders',
      'reports',
      'request-forms',
      'requests',
      'settings',
      'tasks',
      'teams',
    ])
  })

  it('declares exactly 48 CRM capabilities', () => {
    expect(permissionKeys()).toHaveLength(48)
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
      permissionKeys().filter((key) => key.startsWith('request-forms.'))
    ).toEqual([
      'request-forms.create',
      'request-forms.delete',
      'request-forms.edit',
      'request-forms.view',
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

  it('emits only unique dot-delimited product-app keys with kebab-case parts', () => {
    const keys = permissionKeys()
    expect(new Set(keys).size).toBe(48)
    expect(
      keys.every((key) => /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(key))
    ).toBe(true)
    expect(keys.some((key) => key.startsWith('console:'))).toBe(false)
  })
})
