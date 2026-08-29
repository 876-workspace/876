import { describe, expect, it } from 'vitest'

import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
} from './catalogs'
import { can, hasFeature, variantOf, type AccessContext } from './context'
import {
  groupByModule,
  hasPermission,
  resolveEffectivePermissions,
} from './index'

function ctx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'user_test' },
    permissions: ['console:access', 'console:requests', 'users:read'],
    features: ['console_search', 'crm_v2'],
    experiments: { exp_nav: 'compact' },
    ...overrides,
  }
}

describe('can — access control edge cases', () => {
  it('allows exact held permission', () => {
    expect(can(ctx(), 'console:requests')).toBe(true)
  })

  it('denies permission not held', () => {
    expect(can(ctx(), 'console:security')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(can(ctx(), 'Console:Requests')).toBe(false)
  })

  it('does not match prefix', () => {
    expect(can(ctx({ permissions: ['users:read:extra'] }), 'users:read')).toBe(
      false
    )
    expect(can(ctx({ permissions: ['users:read'] }), 'users:read:extra')).toBe(
      false
    )
  })

  it('denies empty string', () => {
    expect(can(ctx(), '')).toBe(false)
    expect(can(ctx({ permissions: [''] }), '')).toBe(false)
  })

  it('denies when permissions undefined at runtime', () => {
    const malformed = {
      subject: { userId: 'u' },
      features: [],
      experiments: {},
    } as unknown as AccessContext
    expect(can(malformed, 'console:access')).toBe(false)
  })

  it('denies when permissions is string at runtime', () => {
    const malformed = {
      ...ctx(),
      permissions: 'console:access' as unknown as string[],
    }
    expect(can(malformed, 'console:access')).toBe(false)
  })

  it('denies when context is null', () => {
    expect(can(null as unknown as AccessContext, 'console:access')).toBe(false)
  })

  it('denies when context is undefined', () => {
    expect(can(undefined as unknown as AccessContext, 'console:access')).toBe(
      false
    )
  })

  it('ignores non-string entries in permissions array', () => {
    const malformed = ctx({
      permissions: [
        'console:access',
        42 as unknown as string,
        null as unknown as string,
      ],
    })
    expect(can(malformed, 'console:access')).toBe(true)
    expect(can(malformed, '42' as string)).toBe(false)
  })

  it('handles 0 and false permission keys', () => {
    expect(can(ctx(), 0 as unknown as string)).toBe(false)
    expect(can(ctx(), false as unknown as string)).toBe(false)
  })

  it('handles prototype pollution attempt', () => {
    expect(can(ctx(), '__proto__')).toBe(false)
    expect(can(ctx({ permissions: ['__proto__'] }), '__proto__')).toBe(true)
  })

  it('never throws for weird permission types', () => {
    const weirds: unknown[] = [
      null,
      undefined,
      0,
      {},
      [],
      () => {},
      Symbol('a'),
      NaN,
      Infinity,
    ]
    for (const w of weirds) {
      expect(() => can(ctx(), w as unknown as string)).not.toThrow()
      if (typeof w !== 'string' || w !== 'console:access') {
        expect(can(ctx(), w as unknown as string)).toBe(false)
      }
    }
  })

  it('handles very long permission string', () => {
    const long = 'a'.repeat(500)
    expect(can(ctx(), long)).toBe(false)
    expect(can(ctx({ permissions: [long] }), long)).toBe(true)
  })

  it('handles unicode and emoji permission', () => {
    expect(can(ctx({ permissions: ['perm:🔥'] }), 'perm:🔥')).toBe(true)
    expect(can(ctx(), 'perm:🔥')).toBe(false)
  })
})

describe('hasFeature — access control edge cases', () => {
  it('allows exact feature', () => {
    expect(hasFeature(ctx(), 'console_search')).toBe(true)
  })

  it('denies missing feature', () => {
    expect(hasFeature(ctx(), 'missing')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(hasFeature(ctx(), 'Console_Search')).toBe(false)
  })

  it('denies empty string', () => {
    expect(hasFeature(ctx(), '')).toBe(false)
  })

  it('denies when features undefined', () => {
    const malformed = {
      subject: { userId: 'u' },
      permissions: [],
      experiments: {},
    } as unknown as AccessContext
    expect(hasFeature(malformed, 'console_search')).toBe(false)
  })

  it('denies when features is string', () => {
    const malformed = {
      ...ctx(),
      features: 'console_search' as unknown as string[],
    }
    expect(hasFeature(malformed, 'console_search')).toBe(false)
  })

  it('handles null context', () => {
    expect(hasFeature(null as unknown as AccessContext, 'x')).toBe(false)
  })

  it('ignores non-string features', () => {
    const malformed = ctx({
      features: ['console_search', 123 as unknown as string],
    })
    expect(hasFeature(malformed, 'console_search')).toBe(true)
  })

  it('never throws for weird inputs', () => {
    const weirds: unknown[] = [null, undefined, 0, {}, [], Symbol('x')]
    for (const w of weirds) {
      expect(() => hasFeature(ctx(), w as unknown as string)).not.toThrow()
    }
  })
})

describe('variantOf — presentation only, never auth', () => {
  it('returns variant for assigned experiment', () => {
    expect(variantOf(ctx(), 'exp_nav')).toBe('compact')
  })

  it('returns null for unassigned', () => {
    expect(variantOf(ctx(), 'other')).toBeNull()
  })

  it('returns null for empty experiments', () => {
    expect(variantOf(ctx({ experiments: {} }), 'exp_nav')).toBeNull()
  })

  it('returns null for null experiments at runtime', () => {
    const malformed = {
      ...ctx(),
      experiments: null,
    } as unknown as AccessContext
    expect(variantOf(malformed, 'exp_nav')).toBeNull()
  })

  it('returns null for array experiments at runtime', () => {
    const malformed = {
      ...ctx(),
      experiments: [] as unknown as Record<string, string>,
    }
    expect(variantOf(malformed, 'exp_nav')).toBeNull()
  })

  it('returns null for non-string variant value', () => {
    const malformed = ctx({
      experiments: { exp_nav: 123 as unknown as string },
    })
    expect(variantOf(malformed, 'exp_nav')).toBeNull()
  })

  it('is case-sensitive', () => {
    expect(variantOf(ctx(), 'EXP_NAV')).toBeNull()
  })

  it('denies empty experiment key', () => {
    expect(variantOf(ctx(), '')).toBeNull()
  })

  it('never throws for weird keys', () => {
    const weirds: unknown[] = [null, undefined, 0, {}, [], Symbol('s')]
    for (const w of weirds) {
      expect(() => variantOf(ctx(), w as unknown as string)).not.toThrow()
      expect(variantOf(ctx(), w as unknown as string)).toBeNull()
    }
  })

  it('does not leak experiment into permission check', () => {
    const c = ctx({
      permissions: ['console:access'],
      experiments: { 'console:requests': 'true' },
    })
    expect(can(c, 'console:requests')).toBe(false)
    expect(variantOf(c, 'console:requests')).toBe('true')
  })
})

describe('resolveEffectivePermissions — security', () => {
  it('filters to catalog — stale permissions removed', () => {
    expect(
      resolveEffectivePermissions({
        role: {
          permissions: ['console:access', 'stale:perm', 'console:requests'],
        },
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access', 'console:requests'])
  })

  it('role null gives no permissions', () => {
    expect(
      resolveEffectivePermissions({
        role: null,
        catalog: consolePermissionCatalog,
      })
    ).toEqual([])
  })

  it('grants add, denies remove, denies win over grants', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        grants: ['console:requests', 'users:read'],
        denies: ['users:read'],
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:requests'])
  })

  it('ignores grants not in catalog', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: [] },
        grants: ['evil:perm'],
        catalog: consolePermissionCatalog,
      })
    ).toEqual([])
  })

  it('denies filter even if permission not in role', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['console:access'] },
        denies: ['console:requests'],
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access'])
  })

  it('handles null grants/denies without throwing', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        grants: null,
        denies: null,
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['users:read'])
  })

  it('hasPermission helper checks effective set', () => {
    const effective = resolveEffectivePermissions({
      role: { permissions: ['console:access', 'users:read'] },
      catalog: consolePermissionCatalog,
    })
    expect(hasPermission(effective, 'console:access')).toBe(true)
    expect(hasPermission(effective, 'console:requests')).toBe(false)
    expect(hasPermission(null, 'console:access')).toBe(false)
    expect(hasPermission(undefined, 'console:access')).toBe(false)
  })

  it('groupByModule marks granted correctly', () => {
    const effective = ['console:access', 'users:read']
    const grouped = groupByModule(consolePermissionCatalog, effective)
    const consoleMod = grouped.find((m) => m.key === 'console')!
    const usersMod = grouped.find((m) => m.key === 'users')!
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:access')?.granted
    ).toBe(true)
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:requests')?.granted
    ).toBe(false)
    expect(
      usersMod.permissions.find((p) => p.key === 'users:read')?.granted
    ).toBe(true)
    expect(
      usersMod.permissions.find((p) => p.key === 'users:delete')?.granted
    ).toBe(false)
  })

  it('groupByModule handles null effective', () => {
    const grouped = groupByModule(consolePermissionCatalog, null)
    for (const mod of grouped) {
      for (const p of mod.permissions) expect(p.granted).toBe(false)
    }
  })

  it('resolveEffectivePermissions never throws for completely malformed input', () => {
    expect(() =>
      resolveEffectivePermissions({
        role: 'not-an-object' as unknown as { permissions: string[] },
        catalog: 'bad' as unknown as never,
      })
    ).not.toThrow()
    expect(
      resolveEffectivePermissions({
        role: 'bad' as unknown as never,
        catalog: 'bad' as unknown as never,
      })
    ).toEqual([])
  })

  it('injection attempt via permission string is just filtered', () => {
    const evil = "users:read'; DROP TABLE roles; --"
    expect(
      resolveEffectivePermissions({
        role: { permissions: [evil] },
        catalog: consolePermissionCatalog,
      })
    ).toEqual([])
    expect(can(ctx({ permissions: [evil] }), evil)).toBe(true)
    expect(can(ctx(), evil)).toBe(false)
  })
})

describe('catalog vs access-control boundary', () => {
  it('console:requests is the only requests permission in console catalog', () => {
    const requestsPerms = consolePermissionCatalog.permissions.filter(
      (p) => p.action === 'requests'
    )
    expect(requestsPerms).toEqual([
      expect.objectContaining({
        key: 'console:requests',
        moduleKey: 'console',
      }),
    ])
  })

  it('adapt + resolve roundtrip for legacy role preserves intent', () => {
    const legacyRole = { permissions: ['console:support', 'users:read'] }
    const adapted = adaptStoredConsolePermissions(legacyRole.permissions)
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:requests', 'users:read'])
  })

  it('canonical role does not need adaptation', () => {
    const canonical = { permissions: ['console:requests', 'users:read'] }
    const effective = resolveEffectivePermissions({
      role: canonical,
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:requests', 'users:read'])
  })
})
