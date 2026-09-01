import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveAccessContext: vi.fn(),
  findConsoleAccess: vi.fn(),
  resolveConsoleGrant: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))
vi.mock('@/lib/auth/access-context', () => ({
  resolveAccessContext: mocks.resolveAccessContext,
  resolveConsoleGrant: mocks.resolveConsoleGrant,
}))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/permissions')>()),
}))

// We test route-permissions + can integration directly for guards logic, without invoking Next redirect
import { can, hasFeature } from '@876/core/access'
import {
  consolePermissionCatalog,
  toStoredPermissionKeys,
} from '@876/core/access/catalogs'
import { resolveEffectivePermissions } from '@876/core/access'
import { SYSTEM_ROLE_DEFINITIONS } from '@/lib/permissions'
import { ROUTE_PERMISSIONS } from './route-permissions'

describe('guards — permission integration (stored keys)', () => {
  function ctx(perms: string[]) {
    return {
      subject: { userId: 'u' },
      permissions: perms,
      features: [],
      experiments: {},
    }
  }

  it('adapted legacy grants /requests route', () => {
    const adapted = toStoredPermissionKeys(['console:requests'])
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(can(ctx(eff), ROUTE_PERMISSIONS['/requests'])).toBe(true)
  })

  it('a retired support key does NOT grant /requests', () => {
    const eff = resolveEffectivePermissions({
      role: { permissions: ['console:support'] },
      catalog: consolePermissionCatalog,
    })

    expect(can(ctx(eff), ROUTE_PERMISSIONS['/requests'])).toBe(false)
  })

  it('staff role can access requests', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((role) => role.name === 'staff')
    if (!staff) throw new Error('Missing staff system role.')

    const eff = resolveEffectivePermissions({
      role: { permissions: staff.permissions },
      catalog: consolePermissionCatalog,
    })
    expect(can(ctx(eff), ROUTE_PERMISSIONS['/requests'])).toBe(true)
    expect(can(ctx(eff), ROUTE_PERMISSIONS['/security'])).toBe(false)
  })

  it('owner can access security and storage', () => {
    const superAdmin = SYSTEM_ROLE_DEFINITIONS.find(
      (role) => role.name === 'super_admin'
    )
    if (!superAdmin) throw new Error('Missing super admin system role.')

    const eff = resolveEffectivePermissions({
      role: { permissions: superAdmin.permissions },
      catalog: consolePermissionCatalog,
    })
    expect(can(ctx(eff), ROUTE_PERMISSIONS['/security'])).toBe(true)
    expect(can(ctx(eff), ROUTE_PERMISSIONS['/storage'])).toBe(true)
  })

  it('feature-gated routes require feature flag', () => {
    const cWithout = ctx(['console:reports'])
    const cWith = {
      subject: { userId: 'u' },
      permissions: ['console:reports'],
      features: ['console_reports'],
      experiments: {},
    }
    // route-permissions alone is permission check; feature check is separate layer in real guards
    expect(can(cWithout, ROUTE_PERMISSIONS['/reports'])).toBe(true) // permission yes
    expect(hasFeature(cWithout, 'console_reports')).toBe(false)
    expect(hasFeature(cWith, 'console_reports')).toBe(true)
  })

  it('every system role maps to effective permissions without retired keys', () => {
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      const eff = resolveEffectivePermissions({
        role: { permissions: role.permissions },
        catalog: consolePermissionCatalog,
      })
      expect(eff).not.toContain('console:support')
      for (const p of eff)
        expect(
          consolePermissionCatalog.permissions.some((x) => x.key === p)
        ).toBe(true)
    }
  })

  it('injection permission is filtered', () => {
    const evil = "console:requests'; DROP TABLE--"
    const eff = resolveEffectivePermissions({
      role: { permissions: [evil, 'console:requests'] },
      catalog: consolePermissionCatalog,
    })
    expect(eff).toEqual(['console:requests'])
  })
})
