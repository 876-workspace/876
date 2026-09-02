import { describe, expect, it } from 'vitest'

import {
  buildAccessEntries,
  type AccessMembershipInput,
  type AccessRoleInput,
} from './entries'

function membership(
  overrides: Partial<AccessMembershipInput> = {}
): AccessMembershipInput {
  return {
    id: 'assign_1',
    app_id: 'app_crm',
    app_slug: '876-crm',
    app_name: 'CRM',
    status: 'active',
    assigned: true,
    entitled: true,
    app_role: null,
    permission_grants: [],
    permission_denies: [],
    effective_permissions: ['requests:view'],
    ...overrides,
  }
}
function role(overrides: Partial<AccessRoleInput> = {}): AccessRoleInput {
  return {
    id: 'role_1',
    key: 'agent',
    name: 'Agent',
    description: null,
    permissions: ['requests:view'],
    is_system: true,
    is_default: false,
    ...overrides,
  }
}

describe('buildAccessEntries', () => {
  it('maps membership identity into an access entry', () => {
    const [entry] = buildAccessEntries([membership()], new Map())
    expect(entry.appId).toBe('app_crm')
  })
  it('maps roles from orgAppRoles', () => {
    const [entry] = buildAccessEntries(
      [membership()],
      new Map([['app_crm', [role()]]])
    )
    expect(entry.roles[0]?.name).toBe('Agent')
  })
  it('maps the current app role', () => {
    const [entry] = buildAccessEntries(
      [membership({ app_role: role() })],
      new Map()
    )
    expect(entry.role?.id).toBe('role_1')
  })
  it('includes catalog permissions for known apps', () => {
    const [entry] = buildAccessEntries([membership()], new Map())
    expect(entry.catalog.length).toBeGreaterThan(0)
  })
  it('uses catalog module labels instead of module keys', () => {
    const [entry] = buildAccessEntries([membership()], new Map())
    expect(
      entry.catalog.find((permission) => permission.moduleKey === 'requests')
        ?.moduleLabel
    ).toBe('Requests')
  })
  it('retains an app that has no catalog', () => {
    const [entry] = buildAccessEntries(
      [membership({ app_slug: 'unknown-app' })],
      new Map()
    )
    expect(entry.catalog).toEqual([])
  })
  it('retains entitlement and assignment state', () => {
    const [entry] = buildAccessEntries(
      [membership({ entitled: false, assigned: false })],
      new Map()
    )
    expect(entry).toMatchObject({ entitled: false, assigned: false })
  })
  it('maps effective permissions and overrides', () => {
    const [entry] = buildAccessEntries(
      [
        membership({
          permission_grants: ['requests:write'],
          permission_denies: ['requests:delete'],
        }),
      ],
      new Map()
    )
    expect(entry.grants).toEqual(['requests:write'])
    expect(entry.denies).toEqual(['requests:delete'])
  })
  it('keeps each app roles list isolated by app id', () => {
    const [entry] = buildAccessEntries(
      [membership()],
      new Map([['other_app', [role()]]])
    )
    expect(entry.roles).toEqual([])
  })
  it('maps dangerous catalog metadata', () => {
    const [entry] = buildAccessEntries([membership()], new Map())
    expect(
      entry.catalog.some((permission) => permission.isDangerous)
    ).toBeTypeOf('boolean')
  })
  it('does not drop an unassigned entitled app', () => {
    expect(
      buildAccessEntries([membership({ assigned: false })], new Map())
    ).toHaveLength(1)
  })
  it('uses the app display name from the membership', () => {
    const [entry] = buildAccessEntries(
      [membership({ app_name: 'Customer CRM' })],
      new Map()
    )
    expect(entry.appName).toBe('Customer CRM')
  })
})
