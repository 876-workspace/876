import { describe, expect, it } from 'vitest'

import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
  LEGACY_PERMISSION_ALIASES,
} from './catalogs'
import { resolveEffectivePermissions } from './index'

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
  'a'.repeat(500),
  '🔥',
  '__proto__',
  'constructor',
  'hasOwnProperty',
  {},
  [],
  [[]],
  { length: 1 },
  () => {},
  Symbol('s'),
  new Set(['console:support']),
  new Map([['console:support', 'console:requests']]),
  Buffer.from('console:support'),
  new Uint8Array([1, 2]),
]

describe('adaptStoredConsolePermissions — fuzz', () => {
  WEIRDS.forEach((weird, idx) => {
    it(`does not throw for weird input #${idx}: ${String(weird).slice(0, 30)}`, () => {
      expect(() =>
        adaptStoredConsolePermissions(weird as unknown as string[])
      ).not.toThrow()
    })
  })

  WEIRDS.forEach((weird, idx) => {
    it(`returns array for weird input #${idx}`, () => {
      const result = adaptStoredConsolePermissions(weird as unknown as string[])
      expect(Array.isArray(result)).toBe(true)
    })
  })

  it('handles object with poisoned prototype', () => {
    const polluted = JSON.parse(
      '{"__proto__": {"polluted": true}, "console:support": "evil"}'
    )
    const result = adaptStoredConsolePermissions([
      'console:support',
      polluted['console:support'] as string,
    ])
    expect(result).toContain('console:requests')
    expect(
      (Object.prototype as unknown as Record<string, unknown>)['polluted']
    ).toBeUndefined()
  })

  it('adaptation is pure — repeated calls identical', () => {
    for (let i = 0; i < 10; i++) {
      expect(
        adaptStoredConsolePermissions(['console:support', 'users:read'])
      ).toEqual(['console:requests', 'users:read'])
    }
  })

  it('never emits legacy key even after adaptation', () => {
    const inputs = [
      ['console:support'],
      ['console:support', 'console:support'],
      ['users:read', 'console:support', 'console:access'],
    ]
    for (const input of inputs) {
      const adapted = adaptStoredConsolePermissions(input)
      expect(adapted).not.toContain('console:support')
    }
  })

  it('adapted output is subset of string input plus canonical mapping', () => {
    const input = [
      'console:support',
      'users:read',
      'custom:perm',
      123 as unknown as string,
    ]
    const adapted = adaptStoredConsolePermissions(input as unknown as string[])
    expect(adapted).toEqual(['console:requests', 'users:read', 'custom:perm'])
  })
})

describe('resolveEffectivePermissions — fuzz after adaptation', () => {
  WEIRDS.forEach((weird, idx) => {
    it(`never throws with weird role permissions #${idx}`, () => {
      expect(() =>
        resolveEffectivePermissions({
          role: { permissions: [weird as unknown as string] },
          catalog: consolePermissionCatalog,
        })
      ).not.toThrow()
    })
  })

  it('handles massive mixed weird array', () => {
    const mixed = [
      ...WEIRDS.map((w) => String(w)),
      'console:support',
      'console:requests',
      'users:read',
    ] as unknown as string[]
    const adapted = adaptStoredConsolePermissions(mixed)
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toContain('console:requests')
    expect(effective).toContain('users:read')
    expect(effective).not.toContain('console:support')
  })

  it('denies injection via weird denies', () => {
    for (const weird of WEIRDS) {
      expect(() =>
        resolveEffectivePermissions({
          role: { permissions: ['console:access', 'users:read'] },
          denies: [weird as unknown as string],
          catalog: consolePermissionCatalog,
        })
      ).not.toThrow()
    }
  })

  it('grants weird values are ignored safely', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['console:access'] },
        grants: WEIRDS as unknown as string[],
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access'])
  })
})

describe('LEGACY_PERMISSION_ALIASES — invariants fuzz', () => {
  it('all alias values are valid catalog keys', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    for (const [k, v] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
      expect(typeof k).toBe('string')
      expect(typeof v).toBe('string')
      expect(catalogKeys.has(v)).toBe(true)
      expect(catalogKeys.has(k)).toBe(false)
    }
  })

  it('no alias maps to itself', () => {
    for (const [k, v] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
      expect(k).not.toBe(v)
    }
  })

  it('adapting alias value is stable (idempotent on value)', () => {
    for (const v of Object.values(LEGACY_PERMISSION_ALIASES)) {
      expect(adaptStoredConsolePermissions([v])).toEqual([v])
    }
  })
})
