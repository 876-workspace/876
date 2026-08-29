import { describe, expect, it } from 'vitest'
import type { SettingsOption } from './settings-options'
import {
  SETTINGS_OPTIONS,
  SETTINGS_NAVIGATION,
  resolveSettingsOptions,
} from './settings-options'
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

describe('settings-options — weird', () => {
  it('SETTINGS_OPTIONS has 6 entries (general, team, roles, security, orgs, notifications)', () => {
    expect(SETTINGS_OPTIONS.map((o) => o.key)).toEqual([
      'general',
      'team',
      'roles',
      'security',
      'orgs',
      'notifications',
    ])
  })
  it('general and orgs and notifications are always visible (no requires)', () => {
    const res = resolveSettingsOptions(ctx())
    expect(res.map((o) => o.key)).toEqual(['general', 'orgs', 'notifications'])
  })
  it('team visible only with team:list', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['team:list'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(true)
    expect(resolveSettingsOptions(ctx()).some((o) => o.key === 'team')).toBe(
      false
    )
  })
  it('roles visible only with roles:list', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['roles:list'] })).some(
        (o) => o.key === 'roles'
      )
    ).toBe(true)
    expect(resolveSettingsOptions(ctx()).some((o) => o.key === 'roles')).toBe(
      false
    )
  })
  it('security visible only with console:security', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['console:security'] })).some(
        (o) => o.key === 'security'
      )
    ).toBe(true)
    expect(
      resolveSettingsOptions(ctx()).some((o) => o.key === 'security')
    ).toBe(false)
  })
  it('case-sensitive: TEAM:LIST does not grant team', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['TEAM:LIST'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('spaces not trimmed: " team:list " does not grant', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: [' team:list '] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('handles duplicate permissions', () => {
    expect(
      resolveSettingsOptions(
        ctx({ permissions: ['team:list', 'team:list'] })
      ).some((o) => o.key === 'team')
    ).toBe(true)
  })
  it('handles non-string permissions filtered', () => {
    const perms = [
      'team:list',
      42 as unknown as string,
      null as unknown as string,
    ]
    expect(
      resolveSettingsOptions(ctx({ permissions: perms })).some(
        (o) => o.key === 'team'
      )
    ).toBe(true)
  })
  it('handles sparse array permissions', () => {
    const sparse = Array(2) as unknown as string[]
    sparse[1] = 'team:list'
    expect(
      resolveSettingsOptions(ctx({ permissions: sparse })).some(
        (o) => o.key === 'team'
      )
    ).toBe(true)
  })
  it('handles Uint8Array (not array) -> only always-visible', () => {
    expect(
      resolveSettingsOptions(
        ctx({ permissions: new Uint8Array([1]) as unknown as string[] })
      ).map((o) => o.key)
    ).toEqual(['general', 'orgs', 'notifications'])
  })
  it('handles Object.create(null) context', () => {
    const weird = Object.create(null) as AccessContext
    weird.permissions = ['team:list']
    weird.features = []
    weird.experiments = {}
    weird.subject = { userId: 'u1' }
    expect(
      resolveSettingsOptions(weird as AccessContext).some(
        (o) => o.key === 'team'
      )
    ).toBe(true)
  })
  it('handles frozen context', () => {
    expect(
      resolveSettingsOptions(
        Object.freeze(ctx({ permissions: ['roles:list'] }))
      ).some((o) => o.key === 'roles')
    ).toBe(true)
  })
  it('handles __proto__ permission does not pollute', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['__proto__'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('returns defensive copies (mutating result does not affect next call)', () => {
    const first = resolveSettingsOptions(ctx({ permissions: ['team:list'] }))
    ;(first as SettingsOption[]).push({
      key: 'evil',
      title: 'Evil',
      description: '',
      href: '/evil',
      icon: 'evil',
      iconColor: '',
    })
    const second = resolveSettingsOptions(ctx({ permissions: ['team:list'] }))
    expect(second.some((o) => o.key === 'evil')).toBe(false)
  })
  it('each option has href starting with /settings', () => {
    for (const o of SETTINGS_OPTIONS) {
      expect(o.href.startsWith('/settings')).toBe(true)
    }
  })
  it('each option iconColor is Tailwind text-*', () => {
    for (const o of SETTINGS_OPTIONS) expect(o.iconColor).toMatch(/text-/)
  })
  it('SETTINGS_NAVIGATION mirrors SETTINGS_OPTIONS keys', () => {
    const navKeys = resolveNavigation(
      SETTINGS_NAVIGATION,
      ctx({ permissions: ['team:list', 'roles:list', 'console:security'] })
    ).flatMap((g) => g.entries.map((e) => e.key))
    // with all perms, all options visible
    const opts = resolveSettingsOptions(
      ctx({ permissions: ['team:list', 'roles:list', 'console:security'] })
    ).map((o) => o.key)
    expect(navKeys.sort()).toEqual(opts.sort())
  })
  it('handles 10k fake perms still only grants real ones', () => {
    const many = Array.from({ length: 10000 }, (_, i) => `fake:${i}`)
    expect(
      resolveSettingsOptions(ctx({ permissions: [...many, 'team:list'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(true)
    expect(
      resolveSettingsOptions(ctx({ permissions: many })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('handles permission with newline', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['team:list\n'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('handles permission with null char', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['team:list\u0000'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('handles permission with RTL override', () => {
    expect(
      resolveSettingsOptions(ctx({ permissions: ['team:list\u202e'] })).some(
        (o) => o.key === 'team'
      )
    ).toBe(false)
  })
  it('handles context with getter throwing for permissions (still shows always-visible)', () => {
    const evil = {
      get permissions() {
        throw new Error('boom')
      },
      features: [],
      experiments: {},
      subject: { userId: 'u1' },
    } as unknown as AccessContext
    expect(resolveSettingsOptions(evil).map((o) => o.key)).toEqual([
      'general',
      'orgs',
      'notifications',
    ])
  })
  it('mutating returned option does not mutate source', () => {
    const res = resolveSettingsOptions(ctx())
    const first = res[0]!
    const original = SETTINGS_OPTIONS.find((o) => o.key === first.key)!.title
    ;(first as { title: string }).title = 'EVIL'
    expect(SETTINGS_OPTIONS.find((o) => o.key === first.key)!.title).toBe(
      original
    )
  })
})
