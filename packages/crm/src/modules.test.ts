import { crmPermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import {
  CRM_INTEGRATION_SCOPES,
  isCrmIntegrationScope,
} from './integration-scopes'
import {
  CRM_EXCLUDED_MODULE_KEYS,
  CRM_MODULE_KEYS,
  crmModuleCatalog,
} from './modules'

const permissionModules = new Set(
  crmPermissionCatalog.permissions.map((permission) => permission.moduleKey)
)

describe('CRM module catalog', () => {
  it('uses the exact functional module vocabulary', () => {
    expect(crmModuleCatalog.map((module) => module.key)).toEqual([
      'requests',
      'tasks',
      'reminders',
      'events',
      'notes',
      'teams',
      'categories',
      'request_forms',
      'reports',
    ])
  })

  it('keeps exported module keys aligned with the catalog', () => {
    expect([...CRM_MODULE_KEYS]).toEqual(
      crmModuleCatalog.map((module) => module.key)
    )
  })

  it('keeps every module key inside the CRM permission catalog', () => {
    expect(
      crmModuleCatalog.filter((module) => !permissionModules.has(module.key))
    ).toEqual([])
  })

  it('accounts for every permission module as either toggleable or excluded', () => {
    const accounted = new Set<string>([
      ...CRM_MODULE_KEYS,
      ...CRM_EXCLUDED_MODULE_KEYS,
    ])

    expect([...permissionModules].filter((key) => !accounted.has(key))).toEqual(
      []
    )
  })

  it('records the exact deliberate module exclusions', () => {
    expect([...CRM_EXCLUDED_MODULE_KEYS]).toEqual([
      'calendars',
      'customers',
      'my_work',
      'priorities',
      'settings',
    ])
  })

  it('never lists a module as both toggleable and excluded', () => {
    const toggleable = new Set<string>(CRM_MODULE_KEYS)

    expect(
      CRM_EXCLUDED_MODULE_KEYS.filter((key) => toggleable.has(key))
    ).toEqual([])
  })

  it('never excludes a key the permission catalog does not define', () => {
    expect(
      CRM_EXCLUDED_MODULE_KEYS.filter((key) => !permissionModules.has(key))
    ).toEqual([])
  })

  it('gives every toggleable module a view permission to gate its settings page', () => {
    const viewable = new Set(
      crmPermissionCatalog.permissions
        .filter((permission) => permission.action === 'view')
        .map((permission) => permission.moduleKey)
    )

    expect(
      crmModuleCatalog.filter((module) => !viewable.has(module.key))
    ).toEqual([])
  })

  it('keeps requests structural and enabled by default', () => {
    expect(
      crmModuleCatalog.find((module) => module.key === 'requests')
    ).toEqual({
      key: 'requests',
      label: 'Requests',
      optional: false,
      enabledByDefault: true,
      preferences: [],
    })
  })

  it('keeps every optional module enabled by default until an org opts out', () => {
    expect(
      crmModuleCatalog
        .filter((module) => module.key !== 'requests')
        .map((module) => ({
          key: module.key,
          optional: module.optional,
          enabled: module.enabledByDefault,
        }))
    ).toEqual([
      { key: 'tasks', optional: true, enabled: true },
      { key: 'reminders', optional: true, enabled: true },
      { key: 'events', optional: true, enabled: true },
      { key: 'notes', optional: true, enabled: true },
      { key: 'teams', optional: true, enabled: true },
      { key: 'categories', optional: true, enabled: true },
      { key: 'request_forms', optional: true, enabled: true },
      { key: 'reports', optional: true, enabled: true },
    ])
  })
})

describe('CRM integration scopes', () => {
  it('publishes the exact stable scope list', () => {
    expect(CRM_INTEGRATION_SCOPES).toEqual([
      'crm.requests.read',
      'crm.requests.write',
      'crm.customers.read',
      'crm.customers.write',
      'crm.tasks.read',
      'crm.tasks.write',
      'crm.reminders.read',
      'crm.reminders.write',
      'crm.notes.read',
      'crm.notes.write',
      'crm.teams.read',
      'crm.teams.write',
      'crm.categories.read',
      'crm.categories.write',
      'crm.priorities.read',
      'crm.priorities.write',
      'crm.request_forms.read',
      'crm.request_forms.write',
      'crm.reports.read',
    ])
  })

  it('never publishes a Console operator permission as an integration scope', () => {
    expect(
      CRM_INTEGRATION_SCOPES.some((scope) => scope.startsWith('console:'))
    ).toBe(false)
  })

  it('does not publish write access for reports', () => {
    expect(CRM_INTEGRATION_SCOPES).toContain('crm.reports.read')
    expect(CRM_INTEGRATION_SCOPES).not.toContain('crm.reports.write')
  })

  it('recognizes canonical scopes', () => {
    expect(isCrmIntegrationScope('crm.requests.read')).toBe(true)
    expect(isCrmIntegrationScope('crm.tasks.write')).toBe(true)
  })

  it('names only modules the CRM permission catalog defines', () => {
    const scopeModules = CRM_INTEGRATION_SCOPES.map(
      (scope) => scope.split('.')[1]!
    )

    expect(
      [...new Set(scopeModules)].filter((key) => !permissionModules.has(key))
    ).toEqual([])
  })

  it('scopes every entry to CRM so a cross-service scope cannot slip in', () => {
    expect(
      CRM_INTEGRATION_SCOPES.filter((scope) => !scope.startsWith('crm.'))
    ).toEqual([])
  })

  it('publishes each scope exactly once', () => {
    expect(new Set(CRM_INTEGRATION_SCOPES).size).toBe(
      CRM_INTEGRATION_SCOPES.length
    )
  })

  it('rejects invented and operator scopes', () => {
    expect(isCrmIntegrationScope('crm.requests.admin')).toBe(false)
    expect(isCrmIntegrationScope('console:requests')).toBe(false)
  })
})
