import { describe, expect, it } from 'vitest'
import { can, hasFeature, variantOf } from './context'
import type { AccessContext } from './context'
import {
  resolveEffectivePermissions,
  hasPermission,
  groupByModule,
} from './index'
import { consolePermissionCatalog, toStoredPermissionKeys } from './catalogs'

function ctx(
  perms: string[] = [],
  feats: string[] = [],
  exps: Record<string, string> = {}
): AccessContext {
  return {
    subject: { userId: 'u' },
    permissions: perms,
    features: feats,
    experiments: exps,
  }
}

describe('context massive — can/hasFeature/variantOf triad', () => {
  it.each([
    ['console:access', true],
    ['console:requests', false],
    ['users:read', true],
    ['users:delete', false],
    ['', false],
    ['CONSOLE:ACCESS', false],
  ])('can %j => %j', (perm, expected) => {
    expect(can(ctx(['console:access', 'users:read']), perm as string)).toBe(
      expected
    )
  })

  it.each([
    ['feat_a', true],
    ['feat_b', false],
    ['', false],
    ['FEAT_A', false],
  ])('hasFeature %j => %j', (feat, expected) => {
    expect(hasFeature(ctx([], ['feat_a']), feat as string)).toBe(expected)
  })

  it.each([
    ['exp_a', 'v1', 'v1'],
    ['exp_a', undefined, null],
    ['', 'v1', null],
  ])('variantOf %j => %j', (exp, val, expected) => {
    const c = val ? ctx([], [], { [exp]: val }) : ctx([], [], {})
    expect(variantOf(c, exp)).toBe(expected)
  })

  it('can with null context fails closed', () => {
    expect(can(null as unknown as AccessContext, 'console:access')).toBe(false)
    expect(hasFeature(null as unknown as AccessContext, 'feat')).toBe(false)
    expect(variantOf(null as unknown as AccessContext, 'exp')).toBeNull()
  })

  it('can with undefined permissions fails closed', () => {
    expect(
      can(
        {
          subject: { userId: 'u' },
          features: [],
          experiments: {},
        } as unknown as AccessContext,
        'console:access'
      )
    ).toBe(false)
  })

  it('hasFeature with non-array features fails closed', () => {
    expect(
      hasFeature(
        {
          subject: { userId: 'u' },
          permissions: [],
          features: 'feat',
          experiments: {},
        } as unknown as AccessContext,
        'feat'
      )
    ).toBe(false)
  })

  it('variantOf with array experiments fails closed', () => {
    expect(
      variantOf(
        {
          subject: { userId: 'u' },
          permissions: [],
          features: [],
          experiments: [],
        } as unknown as AccessContext,
        'exp'
      )
    ).toBeNull()
  })

  it('cross-concern: experiment does not grant permission', () => {
    const c = ctx(['console:access'], [], { 'console:requests': 'on' })
    expect(can(c, 'console:requests')).toBe(false)
    expect(variantOf(c, 'console:requests')).toBe('on')
  })

  it('stored canonical permission grants can true', () => {
    const eff = resolveEffectivePermissions({
      role: { permissions: toStoredPermissionKeys(['console:requests']) },
      catalog: consolePermissionCatalog,
    })
    expect(can(ctx(eff), 'console:requests')).toBe(true)
    expect(can(ctx(eff), 'console:support')).toBe(false)
  })

  it('hasPermission vs can aligned for all catalog keys', () => {
    const eff = consolePermissionCatalog.permissions.map((p) => p.key)
    for (const key of eff) {
      expect(hasPermission(eff, key)).toBe(true)
      expect(can(ctx(eff), key)).toBe(true)
    }
    expect(hasPermission(eff, 'not:in:catalog')).toBe(false)
    expect(can(ctx(eff), 'not:in:catalog')).toBe(false)
  })

  it('groupByModule counts granted accurately for owner-like effective', () => {
    const eff = [
      'console:access',
      'console:requests',
      'users:read',
      'users:delete',
      'console:danger_zone',
    ]
    const grouped = groupByModule(
      consolePermissionCatalog,
      eff.filter((k) =>
        consolePermissionCatalog.permissions.some((p) => p.key === k)
      )
    )
    const totalGranted = grouped
      .flatMap((m) => m.permissions)
      .filter((p) => p.granted).length
    expect(totalGranted).toBe(5)
  })

  it('resolveEffectivePermissions filters weird inputs without throw', () => {
    const weirds: unknown[] = [null, undefined, 0, {}, [], 123, '__proto__']
    for (const w of weirds) {
      expect(() =>
        resolveEffectivePermissions({
          role: { permissions: [w as unknown as string] },
          catalog: consolePermissionCatalog,
        })
      ).not.toThrow()
    }
  })

  it('stress: can handles 1000 checks without throw', () => {
    const c = ctx(['console:access'])
    for (let i = 0; i < 1000; i++) expect(can(c, 'console:access')).toBe(true)
  })

  it('unicode edge: emoji permission', () => {
    expect(can(ctx(['perm:🔥']), 'perm:🔥')).toBe(true)
    expect(can(ctx(['perm:🔥']), 'perm:🔥:extra')).toBe(false)
  })

  it('long string permission 2000 chars', () => {
    const long = 'p:' + 'a'.repeat(1998)
    expect(can(ctx([long]), long)).toBe(true)
    expect(can(ctx([]), long)).toBe(false)
  })
})
