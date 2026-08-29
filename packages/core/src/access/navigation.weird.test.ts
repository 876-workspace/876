import { describe, expect, it } from 'vitest'
import type { AccessContext } from './context'
import {
  defineNavigation,
  resolveNavigation,
  type NavGroupDefinition,
  type NavEntry,
} from './navigation'

function ctx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'u1' },
    permissions: [],
    features: [],
    experiments: {},
    ...overrides,
  }
}
function reg(entries: NavEntry[]): readonly NavGroupDefinition[] {
  return defineNavigation([{ key: 'g1', label: 'G1', entries }])
}

describe('resolveNavigation — weird / adversarial', () => {
  it('fails closed to [] when groups is null', () => {
    expect(
      resolveNavigation(null as unknown as readonly NavGroupDefinition[], ctx())
    ).toEqual([])
  })
  it('fails closed when groups is string', () => {
    expect(
      resolveNavigation(
        'oops' as unknown as readonly NavGroupDefinition[],
        ctx()
      )
    ).toEqual([])
  })
  it('fails closed when groups is number', () => {
    expect(
      resolveNavigation(42 as unknown as readonly NavGroupDefinition[], ctx())
    ).toEqual([])
  })
  it('handles groups as function', () => {
    expect(
      resolveNavigation(
        (() => []) as unknown as readonly NavGroupDefinition[],
        ctx()
      )
    ).toEqual([])
  })
  it('handles groups containing null entries', () => {
    const weird = [
      null as unknown as NavGroupDefinition,
      undefined as unknown as NavGroupDefinition,
      { key: 'g1', entries: [{ key: 'a', title: 'A', href: '/', icon: 'a' }] },
    ]
    expect(resolveNavigation(weird, ctx()).length).toBe(1)
  })
  it('skips group with entries not an array', () => {
    const weird = [
      { key: 'g1', entries: 'not-array' },
    ] as unknown as readonly NavGroupDefinition[]
    expect(resolveNavigation(weird, ctx())).toEqual([])
  })
  it('skips group with missing entries', () => {
    const weird = [{ key: 'g1' } as unknown as NavGroupDefinition]
    expect(resolveNavigation(weird, ctx())).toEqual([])
  })
  it('handles group with empty entries array', () => {
    const g = defineNavigation([{ key: 'empty', entries: [] }])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles entry with null requires', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: null as unknown as any,
      },
    ])
    expect(resolveNavigation(g, ctx())[0]?.entries.length).toBe(1)
  })
  it('handles entry requirement with numeric permission', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { permission: 123 as unknown as string },
      },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles entry requirement with empty string permission', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { permission: '' },
      },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles requirement with permission containing spaces', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { permission: ' users:read ' },
      },
    ])
    expect(resolveNavigation(g, ctx({ permissions: ['users:read'] }))).toEqual(
      []
    )
  })
  it('handles requirement with feature not a string', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { feature: 123 as unknown as string },
      },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles anyPermission not an array', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: {
          anyPermission: 'users:read' as unknown as readonly string[],
        },
      },
    ])
    expect(resolveNavigation(g, ctx({ permissions: ['users:read'] }))).toEqual(
      []
    )
  })
  it('handles anyPermission array containing non-strings', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: {
          anyPermission: [
            'users:read',
            42 as unknown as string,
            null as unknown as string,
          ],
        },
      },
    ])
    expect(
      resolveNavigation(g, ctx({ permissions: ['users:read'] }))[0]?.entries
        .length
    ).toBe(1)
    expect(
      resolveNavigation(g, ctx({ permissions: [42 as unknown as string] }))
    ).toEqual([])
  })
  it('handles anyPermission with duplicates', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { anyPermission: ['users:read', 'users:read'] },
      },
    ])
    expect(
      resolveNavigation(g, ctx({ permissions: ['users:read'] }))[0]?.entries
        .length
    ).toBe(1)
  })
  it('handles anyPermission containing empty strings', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { anyPermission: ['', 'users:read'] },
      },
    ])
    expect(
      resolveNavigation(g, ctx({ permissions: ['users:read'] }))[0]?.entries
        .length
    ).toBe(1)
    expect(resolveNavigation(g, ctx({ permissions: [''] }))).toEqual([])
  })
  it('handles anyPermission with 1000 entries none held', () => {
    const many = Array.from({ length: 1000 }, (_, i) => `perm:${i}`)
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { anyPermission: many },
      },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles parent requires failing but child would pass — parent removed', () => {
    const g = reg([
      {
        key: 'parent',
        title: 'P',
        href: '/p',
        icon: 'p',
        requires: { permission: 'admin' },
        children: [{ key: 'child', title: 'C', href: '/c', icon: 'c' }],
      },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
    expect(
      resolveNavigation(g, ctx({ permissions: ['admin'] }))[0]?.entries[0]
        ?.children?.length
    ).toBe(1)
  })
  it('handles nested children filtering with mixed requirements', () => {
    const g = reg([
      {
        key: 'p',
        title: 'P',
        href: '/p',
        icon: 'p',
        children: [
          {
            key: 'a',
            title: 'A',
            href: '/a',
            icon: 'a',
            requires: { permission: 'a:read' },
          },
          {
            key: 'b',
            title: 'B',
            href: '/b',
            icon: 'b',
            requires: { permission: 'b:read' },
          },
          { key: 'c', title: 'C', href: '/c', icon: 'c' },
        ],
      },
    ])
    const res = resolveNavigation(g, ctx({ permissions: ['b:read'] }))
    expect(res[0]?.entries[0]?.children?.map((c) => c.key)).toEqual(['b', 'c'])
  })
  it('handles deeply nested children (3 levels) with filtering at leaf', () => {
    const g = reg([
      {
        key: 'l1',
        title: 'L1',
        href: '/1',
        icon: 'a',
        children: [
          {
            key: 'l2',
            title: 'L2',
            href: '/2',
            icon: 'b',
            children: [
              {
                key: 'l3a',
                title: 'L3A',
                href: '/3a',
                icon: 'c',
                requires: { permission: 'need' },
              },
              { key: 'l3b', title: 'L3B', href: '/3b', icon: 'c' },
            ],
          },
        ],
      },
    ])
    expect(
      resolveNavigation(g, ctx())[0]?.entries[0]?.children?.[0]?.children?.map(
        (c) => c.key
      )
    ).toEqual(['l3b'])
    expect(
      resolveNavigation(
        g,
        ctx({ permissions: ['need'] })
      )[0]?.entries[0]?.children?.[0]?.children?.map((c) => c.key)
    ).toEqual(['l3a', 'l3b'])
  })
  it('returns defensive copy — mutating result does not affect original registry', () => {
    const g = reg([{ key: 'a', title: 'A', href: '/', icon: 'a' }])
    const res = resolveNavigation(g, ctx())
    // @ts-ignore
    res[0].entries.push({
      key: 'evil',
      title: 'EVIL',
      href: '/evil',
      icon: 'x',
    })
    const res2 = resolveNavigation(g, ctx())
    expect(res2[0]?.entries.map((e) => e.key)).toEqual(['a'])
  })
  it('does not leak requires with extra unknown keys', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: {
          permission: 'users:read',
          feature: 'f',
          extra: 'evil',
        } as unknown as any,
      },
    ])
    const res = resolveNavigation(
      g,
      ctx({ permissions: ['users:read'], features: ['f'] })
    )
    expect((res[0]?.entries[0]?.requires as any).extra).toBeUndefined()
  })
  it('handles entry with children as empty array (treated as hasDeclaredChildren -> removed)', () => {
    const g = reg([
      { key: 'p', title: 'P', href: '/p', icon: 'p', children: [] },
    ])
    expect(resolveNavigation(g, ctx())).toEqual([])
  })
  it('handles entry with children null (treated as not declared? actually isArray null false)', () => {
    const g = reg([
      {
        key: 'p',
        title: 'P',
        href: '/p',
        icon: 'p',
        children: null as unknown as NavEntry[],
      },
    ])
    expect(resolveNavigation(g, ctx())[0]?.entries.length).toBe(1)
  })
  it('handles entry icon missing at runtime (still returns entry)', () => {
    const g = reg([
      { key: 'a', title: 'A', href: '/', icon: undefined as unknown as string },
    ])
    expect(resolveNavigation(g, ctx())[0]?.entries[0]?.icon).toBeUndefined()
  })
  it('handles href with javascript: uri (no filtering, just data)', () => {
    const g = reg([
      { key: 'a', title: 'A', href: 'javascript:alert(1)', icon: 'a' },
    ])
    expect(resolveNavigation(g, ctx())[0]?.entries[0]?.href).toBe(
      'javascript:alert(1)'
    )
  })
  it('handles group with __proto__ key', () => {
    const g = defineNavigation([
      {
        key: '__proto__',
        entries: [{ key: 'a', title: 'A', href: '/', icon: 'a' }],
      } as unknown as NavGroupDefinition,
    ])
    expect(resolveNavigation(g, ctx())[0]?.key).toBe('__proto__')
  })
  it('handles circular reference in groups gracefully (fails closed)', () => {
    const evil: any = [
      { key: 'g1', entries: [{ key: 'a', title: 'A', href: '/', icon: 'a' }] },
    ]
    evil[0].entries[0].self = evil
    expect(() => resolveNavigation(evil, ctx())).not.toThrow()
  })
  it('handles Proxy groups', () => {
    const proxied = new Proxy(
      reg([{ key: 'a', title: 'A', href: '/', icon: 'a' }]),
      {
        get(t, p) {
          return (t as any)[p]
        },
      }
    )
    expect(resolveNavigation(proxied, ctx())[0]?.entries.length).toBe(1)
  })
  it('handles context with permissions getter throwing', () => {
    const evilCtx = {
      get permissions() {
        throw new Error('boom')
      },
      features: [],
      experiments: {},
      subject: { userId: 'x' },
    } as unknown as AccessContext
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { permission: 'users:read' },
      },
    ])
    expect(resolveNavigation(g, evilCtx)).toEqual([])
  })
  it('handles feature requirement with RTL override char', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { feature: 'f\u202e_one' },
      },
    ])
    expect(
      resolveNavigation(g, ctx({ features: ['f\u202e_one'] }))[0]?.entries
        .length
    ).toBe(1)
  })
  it('handles permission checking with \u0000 in key', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        requires: { permission: 'a\u0000b' },
      },
    ])
    expect(
      resolveNavigation(g, ctx({ permissions: ['a\u0000b'] }))[0]?.entries
        .length
    ).toBe(1)
    expect(resolveNavigation(g, ctx({ permissions: ['ab'] }))).toEqual([])
  })
  it('preserves colorClassName when present and omits when missing', () => {
    const g = reg([
      {
        key: 'a',
        title: 'A',
        href: '/',
        icon: 'a',
        colorClassName: 'text-red',
      },
      { key: 'b', title: 'B', href: '/', icon: 'b' },
    ])
    const res = resolveNavigation(g, ctx())
    expect(res[0]?.entries[0]?.colorClassName).toBe('text-red')
    expect(res[0]?.entries[1]?.colorClassName).toBeUndefined()
  })
  it('ensures defineNavigation returns same reference (no copy)', () => {
    const groups = [
      { key: 'g', entries: [{ key: 'a', title: 'A', href: '/', icon: 'a' }] },
    ] as const
    const res = defineNavigation(
      groups as unknown as readonly NavGroupDefinition[]
    )
    expect(res).toBe(groups as unknown as readonly NavGroupDefinition[])
  })
  it('handles giant navigation (100 groups, 50 entries each) performantly', () => {
    const groups = Array.from({ length: 100 }, (_, i) => ({
      key: `g${i}`,
      entries: Array.from({ length: 50 }, (_, j) => ({
        key: `e${i}_${j}`,
        title: `E ${j}`,
        href: `/${i}/${j}`,
        icon: 'a',
      })),
    }))
    const res = resolveNavigation(
      groups as unknown as readonly NavGroupDefinition[],
      ctx()
    )
    expect(res.length).toBe(100)
    expect(res[0]?.entries.length).toBe(50)
  })
})
