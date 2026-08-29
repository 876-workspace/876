import { crmPermissionCatalog } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import { CRM_INTEGRATION_SCOPES, isCrmIntegrationScope } from './integration-scopes'
import { CRM_MODULE_KEYS, crmModuleCatalog } from './modules'

const permissionModules = new Set(
  crmPermissionCatalog.permissions.map((permission) => permission.moduleKey)
)

describe('CRM module catalog', () => {
  it('uses the exact functional module vocabulary', () => {
    expect(crmModuleCatalog.map((module) => module.key)).toEqual([
      'requests',
      'tasks',
      'reminders',
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

  it('keeps requests structural and enabled by default', () => {
    expect(crmModuleCatalog.find((module) => module.key === 'requests')).toEqual({
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
        .map((module) => ({ key: module.key, optional: module.optional, enabled: module.enabledByDefault }))
    ).toEqual([
      { key: 'tasks', optional: true, enabled: true },
      { key: 'reminders', optional: true, enabled: true },
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
    expect(CRM_INTEGRATION_SCOPES.some((scope) => scope.startsWith('console:'))).toBe(false)
  })

  it('does not publish write access for reports', () => {
    expect(CRM_INTEGRATION_SCOPES).toContain('crm.reports.read')
    expect(CRM_INTEGRATION_SCOPES).not.toContain('crm.reports.write')
  })

  it('recognizes canonical scopes', () => {
    expect(isCrmIntegrationScope('crm.requests.read')).toBe(true)
    expect(isCrmIntegrationScope('crm.tasks.write')).toBe(true)
  })

  it('rejects invented and operator scopes', () => {
    expect(isCrmIntegrationScope('crm.requests.admin')).toBe(false)
    expect(isCrmIntegrationScope('console:requests')).toBe(false)
  })
})
