import { describe, expect, it } from 'vitest'
import { can, hasFeature, variantOf, type AccessContext } from './context'
import {
  defineAppPermissionCatalog,
  resolveEffectivePermissions,
  groupByModule,
  hasPermission,
} from './index'
import { resolveNavigation, type NavGroupDefinition } from './navigation'

function ctx(
  p: readonly string[],
  f: readonly string[] = [],
  e: Record<string, string> = {}
): AccessContext {
  return {
    subject: { userId: 'u' },
    permissions: p,
    features: f,
    experiments: e,
  }
}

const WEIRDS: unknown[] = [
  null,
  undefined,
  0,
  -1,
  NaN,
  Infinity,
  '',
  ' ',
  '\n',
  '\t',
  '\0',
  '\u202e',
  'a'.repeat(200),
  '🔥',
  '__proto__',
  'constructor',
  {},
  [],
  () => {},
  Symbol('s'),
]

describe('fuzz — can/hasFeature/variantOf resilient', () => {
  WEIRDS.forEach((weird, idx) => {
    it(`can handles weird permission type #${idx}`, () => {
      expect(() =>
        can(ctx(['a:read']), weird as unknown as string)
      ).not.toThrow()
      if (weird !== 'a:read')
        expect(can(ctx(['a:read']), weird as unknown as string)).toBe(false)
    })
  })
  WEIRDS.forEach((weird, idx) => {
    it(`hasFeature handles weird feature type #${idx}`, () => {
      expect(() =>
        hasFeature(ctx([], ['f']), weird as unknown as string)
      ).not.toThrow()
      if (weird !== 'f')
        expect(hasFeature(ctx([], ['f']), weird as unknown as string)).toBe(
          false
        )
    })
  })
  WEIRDS.forEach((weird, idx) => {
    it(`variantOf handles weird experiment key #${idx}`, () => {
      expect(() =>
        variantOf(ctx([], [], { e: 'v' }), weird as unknown as string)
      ).not.toThrow()
      if (typeof weird !== 'string' || weird !== 'e')
        expect(
          variantOf(ctx([], [], { e: 'v' }), weird as unknown as string)
        ).toBeNull()
    })
  })
})

describe('fuzz — defineAppPermissionCatalog rejects weird keys', () => {
  const badKeys = [
    '',
    ' ',
    '\n',
    'A',
    'a.b',
    '1a',
    '__proto__',
    'a'.repeat(65),
    '\u0000',
    'a b',
  ]
  badKeys.forEach((k) => {
    it(`rejects module key ${JSON.stringify(k).slice(0, 20)}`, () => {
      expect(() =>
        defineAppPermissionCatalog({
          app: '876-fuzz',
          modules: [{ key: k, label: 'L', permissions: [] }],
        })
      ).toThrow()
    })
  })
  const badActions = [
    '',
    ' ',
    '\n',
    'View',
    'a.b',
    '1a',
    '__proto__',
    'a'.repeat(65),
    '\u0000',
  ]
  badActions.forEach((a) => {
    it(`rejects action ${JSON.stringify(a).slice(0, 20)}`, () => {
      expect(() =>
        defineAppPermissionCatalog({
          app: '876-fuzz',
          modules: [
            {
              key: 'mod',
              label: 'M',
              permissions: [{ action: a, label: 'L' }],
            },
          ],
        })
      ).toThrow()
    })
  })

  it('accepts canonical kebab-case module and action keys', () => {
    expect(
      defineAppPermissionCatalog({
        app: '876-fuzz',
        modules: [
          {
            key: 'my-module',
            label: 'My module',
            permissions: [{ action: 'view-all', label: 'View all' }],
          },
        ],
      }).permissions[0]?.key
    ).toBe('my-module.view-all')
  })
})

describe('fuzz — resolveEffectivePermissions never throws', () => {
  const catalog = defineAppPermissionCatalog({
    app: '876-fuzz',
    modules: [
      {
        key: 'mod',
        label: 'M',
        permissions: [
          { action: 'view', label: 'View' },
          { action: 'edit', label: 'Edit' },
        ],
      },
    ],
  })
  WEIRDS.forEach((weird, idx) => {
    it(`resolveEffective weird role #${idx} does not throw`, () => {
      expect(() =>
        resolveEffectivePermissions({ role: weird as any, catalog })
      ).not.toThrow()
    })
  })
  WEIRDS.forEach((weird, idx) => {
    it(`resolveEffective weird grants #${idx} does not throw`, () => {
      expect(() =>
        resolveEffectivePermissions({
          role: { permissions: ['mod.view'] },
          grants: weird as any,
          catalog,
        })
      ).not.toThrow()
    })
  })
  WEIRDS.forEach((weird, idx) => {
    it(`resolveEffective weird denies #${idx} does not throw`, () => {
      expect(() =>
        resolveEffectivePermissions({
          role: { permissions: ['mod.view'] },
          denies: weird as any,
          catalog,
        })
      ).not.toThrow()
    })
  })
  it('fuzz 100 random permission strings vs catalog', () => {
    const perms = Array.from({ length: 100 }, (_, i) =>
      i % 2 === 0 ? 'mod.view' : `evil:${i}`
    )
    const res = resolveEffectivePermissions({
      role: { permissions: perms },
      catalog,
    })
    expect(res).toEqual(['mod.view'])
  })
})

describe('fuzz — groupByModule always returns modules', () => {
  const catalog = defineAppPermissionCatalog({
    app: '876-fuzz',
    modules: [
      { key: 'mod', label: 'M', permissions: [{ action: 'view', label: 'V' }] },
    ],
  })
  WEIRDS.forEach((weird, idx) => {
    it(`groupByModule weird effective #${idx}`, () => {
      expect(() => groupByModule(catalog, weird as any)).not.toThrow()
      const res = groupByModule(catalog, weird as any)
      expect(res.length).toBe(1)
    })
  })
})

describe('fuzz — hasPermission never throws', () => {
  WEIRDS.forEach((weird, idx) => {
    it(`hasPermission weird effective #${idx}`, () => {
      expect(() => hasPermission(weird as any, 'mod.view')).not.toThrow()
    })
  })
  WEIRDS.forEach((weird, idx) => {
    it(`hasPermission weird permission #${idx}`, () => {
      expect(() => hasPermission(['mod.view'], weird as any)).not.toThrow()
    })
  })
})

describe('fuzz — resolveNavigation never throws', () => {
  const groups: readonly NavGroupDefinition[] = [
    { key: 'g', entries: [{ key: 'a', title: 'A', href: '/', icon: 'a' }] },
  ]
  const NAV_WEIRDS: unknown[] = [
    null,
    undefined,
    0,
    '',
    {},
    [],
    () => {},
    Symbol('s'),
    new Map(),
    Object.create(null),
    'string',
    42,
  ]
  NAV_WEIRDS.forEach((weird, idx) => {
    it(`resolveNavigation weird groups #${idx}`, () => {
      expect(() =>
        resolveNavigation(weird as any, ctx(['mod.view']))
      ).not.toThrow()
      expect(
        Array.isArray(resolveNavigation(weird as any, ctx(['mod.view'])))
      ).toBe(true)
    })
  })
  NAV_WEIRDS.forEach((weird, idx) => {
    it(`resolveNavigation weird context #${idx}`, () => {
      expect(() => resolveNavigation(groups, weird as any)).not.toThrow()
    })
  })
  it('resolveNavigation with 500 entries fuzz', () => {
    const big: NavGroupDefinition[] = [
      {
        key: 'g',
        entries: Array.from({ length: 500 }, (_, i) => ({
          key: `e${i}`,
          title: `E${i}`,
          href: `/${i}`,
          icon: 'a',
          requires: i % 2 === 0 ? { permission: 'need' } : undefined,
        })),
      },
    ]
    const withPerm = resolveNavigation(big, ctx(['need']))
    const without = resolveNavigation(big, ctx([]))
    expect(withPerm[0]?.entries.length).toBe(500)
    expect(without[0]?.entries.length).toBe(250)
  })
})

describe('mutation fuzz', () => {
  it('mutating returned effective does not affect next call', () => {
    const catalog = defineAppPermissionCatalog({
      app: '876-fuzz',
      modules: [
        {
          key: 'mod',
          label: 'M',
          permissions: [{ action: 'view', label: 'V' }],
        },
      ],
    })
    const r1 = resolveEffectivePermissions({
      role: { permissions: ['mod.view'] },
      catalog,
    })
    r1.push('evil')
    const r2 = resolveEffectivePermissions({
      role: { permissions: ['mod.view'] },
      catalog,
    })
    expect(r2).toEqual(['mod.view'])
  })
})

describe('weird unicode', () => {
  it('can with unicode normalized vs not', () => {
    const nfc = 'café'.normalize('NFC')
    const nfd = 'café'.normalize('NFD')
    expect(can(ctx([nfc]), nfd)).toBe(false)
    expect(can(ctx([nfd]), nfd)).toBe(true)
  })
  it('variantOf with zero-width', () => {
    const k = 'exp\u200B'
    expect(variantOf(ctx([], [], { [k]: 'v' }), k)).toBe('v')
  })
})
