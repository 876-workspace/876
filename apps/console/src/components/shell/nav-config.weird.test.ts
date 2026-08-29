import { describe, expect, it } from 'vitest'
import { navConfig } from './nav-config'
import { resolveNavigation } from '@876/core/access'
import type { AccessContext } from '@876/core/access'

function ctx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'u1' },
    permissions: [],
    features: [],
    experiments: {},
    ...overrides,
  }
}

describe('navConfig — weird', () => {
  it('has primary, platform, manage groups in order', () => {
    expect(navConfig.map((g) => g.key)).toEqual([
      'primary',
      'platform',
      'manage',
    ])
  })
  it('every entry has required shape (key, title, href, icon)', () => {
    for (const g of navConfig) {
      for (const e of g.entries) {
        expect(typeof e.key).toBe('string')
        expect(e.key.length).toBeGreaterThan(0)
        expect(typeof e.title).toBe('string')
        expect(e.title.length).toBeGreaterThan(0)
        expect(typeof e.href).toBe('string')
        expect(e.href.startsWith('/')).toBe(true)
        expect(typeof e.icon).toBe('string')
        expect(e.icon.length).toBeGreaterThan(0)
      }
    }
  })
  it('every protected entry uses colon-delimited permission (not dot)', () => {
    for (const g of navConfig) {
      for (const e of g.entries) {
        if (e.requires?.permission) {
          expect(e.requires.permission.includes(':')).toBe(true)
          expect(e.requires.permission.includes('.')).toBe(false)
        }
      }
    }
  })
  it('hides all protected entries when no permissions', () => {
    const res = resolveNavigation(navConfig, ctx())
    expect(res.flatMap((g) => g.entries).map((e) => e.key)).toEqual([
      'dashboards',
    ])
  })
  it('shows dashboards always (no requires)', () => {
    const res = resolveNavigation(navConfig, ctx({ permissions: [] }))
    expect(
      res.flatMap((g) => g.entries).some((e) => e.key === 'dashboards')
    ).toBe(true)
  })
  it('shows users when console:users held', () => {
    const res = resolveNavigation(
      navConfig,
      ctx({ permissions: ['console:users'] })
    )
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      true
    )
  })
  it('hides users when permission is prefix (console:usersXXX)', () => {
    const res = resolveNavigation(
      navConfig,
      ctx({ permissions: ['console:usersXXX'] })
    )
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      false
    )
  })
  it('handles permissions with duplicates and non-strings weirdly filtered', () => {
    const perms = [
      'console:users',
      42 as unknown as string,
      null as unknown as string,
      'console:users',
    ]
    const res = resolveNavigation(navConfig, ctx({ permissions: perms }))
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      true
    )
  })
  it('handles extremely long permission array (1000 perms) still resolves correctly', () => {
    const many = [...Array(1000).keys()].map((i) => `fake:${i}`)
    const res = resolveNavigation(
      navConfig,
      ctx({ permissions: [...many, 'console:security'] })
    )
    expect(
      res.flatMap((g) => g.entries).some((e) => e.key === 'security')
    ).toBe(true)
  })
  it('handles Object.create(null) context', () => {
    const weird = Object.create(null) as AccessContext
    weird.permissions = ['console:users']
    weird.features = []
    weird.experiments = {}
    weird.subject = { userId: 'u1' }
    const res = resolveNavigation(navConfig, weird as AccessContext)
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      true
    )
  })
  it('handles frozen context', () => {
    const res = resolveNavigation(
      navConfig,
      Object.freeze(ctx({ permissions: ['console:users'] }))
    )
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      true
    )
  })
  it('handles proxy context', () => {
    const proxied = new Proxy(ctx({ permissions: ['console:users'] }), {
      get(t, p) {
        return t[p as keyof AccessContext]
      },
    })
    const res = resolveNavigation(navConfig, proxied)
    expect(res.flatMap((g) => g.entries).some((e) => e.key === 'users')).toBe(
      true
    )
  })
  it('supports case-sensitive permissions (users:LIST not allowed)', () => {
    expect(
      resolveNavigation(navConfig, ctx({ permissions: ['users:LIST'] }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'users')
    ).toBe(false)
  })
  it('handles permission with spaces not trimmed', () => {
    expect(
      resolveNavigation(navConfig, ctx({ permissions: [' console:users '] }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'users')
    ).toBe(false)
  })
  it('handles __proto__ permission weirdly does not grant users', () => {
    expect(
      resolveNavigation(navConfig, ctx({ permissions: ['__proto__'] }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'users')
    ).toBe(false)
  })
  it('settings entry requires console:settings correctly', () => {
    expect(
      resolveNavigation(navConfig, ctx({ permissions: ['console:settings'] }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'settings')
    ).toBe(true)
    expect(
      resolveNavigation(navConfig, ctx({ permissions: [] }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'settings')
    ).toBe(false)
  })
  it('all hrefs are absolute paths (start with /)', () => {
    for (const g of navConfig) {
      for (const e of g.entries) {
        expect(e.href.startsWith('/')).toBe(true)
        expect(e.href.includes('://')).toBe(false)
      }
    }
  })
  it('no entry uses dot-delimited permission (prevent drift)', () => {
    for (const g of navConfig) {
      for (const e of g.entries) {
        if (e.requires?.permission)
          expect(e.requires.permission).not.toContain('.')
      }
    }
  })
  it('every entry colorClassName if present is Tailwind text-*', () => {
    for (const g of navConfig) {
      for (const e of g.entries) {
        if (e.colorClassName) expect(e.colorClassName).toMatch(/text-/)
      }
    }
  })
  it('handles sparse permissions array', () => {
    const sparse = Array(5) as unknown as string[]
    sparse[2] = 'console:users'
    expect(
      resolveNavigation(navConfig, ctx({ permissions: sparse }))
        .flatMap((g) => g.entries)
        .some((e) => e.key === 'users')
    ).toBe(true)
  })
  it('handles Uint8Array permissions (not array) -> only dashboards', () => {
    const res = resolveNavigation(
      navConfig,
      ctx({ permissions: new Uint8Array([1]) as unknown as string[] })
    )
    expect(res.flatMap((g) => g.entries).map((e) => e.key)).toEqual([
      'dashboards',
    ])
  })
})
