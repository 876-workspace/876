import { describe, expect, it } from 'vitest'
import { can, hasFeature, variantOf, type AccessContext } from './context'

function baseContext(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'user_abc123' },
    permissions: ['users:read', 'team:list', 'console:access'],
    features: ['f_one', 'f_two'],
    experiments: { exp_a: 'control', exp_b: 'treatment' },
    ...overrides,
  }
}

describe('can — weird edge cases', () => {
  it('returns false for numeric permission', () => {
    expect(can(baseContext(), 42 as unknown as string)).toBe(false)
  })
  it('returns false for null permission', () => {
    expect(can(baseContext(), null as unknown as string)).toBe(false)
  })
  it('returns false for undefined permission', () => {
    expect(can(baseContext(), undefined as unknown as string)).toBe(false)
  })
  it('returns false for symbol permission', () => {
    expect(can(baseContext(), Symbol('users:read') as unknown as string)).toBe(
      false
    )
  })
  it('returns false for object permission with toString', () => {
    const fake = { toString: () => 'users:read' }
    expect(can(baseContext(), fake as unknown as string)).toBe(false)
  })
  it('is case-sensitive', () => {
    expect(
      can(baseContext({ permissions: ['users:read'] }), 'USERS:READ')
    ).toBe(false)
  })
  it('does not trim permission whitespace', () => {
    expect(
      can(baseContext({ permissions: ['users:read'] }), ' users:read ')
    ).toBe(false)
  })
  it('rejects permission with newline', () => {
    expect(
      can(baseContext({ permissions: ['users:read'] }), 'users:read\n')
    ).toBe(false)
  })
  it('rejects permission with null char', () => {
    expect(can(baseContext(), 'users:read\u0000')).toBe(false)
  })
  it('handles emoji permission key as not found', () => {
    expect(can(baseContext(), '😀:read')).toBe(false)
  })
  it('handles extremely long permission key (10k chars)', () => {
    const long = 'a'.repeat(10000)
    expect(can(baseContext({ permissions: [long] }), long)).toBe(true)
    expect(can(baseContext(), long)).toBe(false)
  })
  it('does not match via substring — whole match only', () => {
    expect(
      can(baseContext({ permissions: ['team:list:extra'] }), 'team:list')
    ).toBe(false)
  })
  it('handles sparse array permissions', () => {
    const sparse = Array(3) as unknown as string[]
    sparse[1] = 'users:read'
    expect(can(baseContext({ permissions: sparse }), 'users:read')).toBe(true)
  })
  it('handles array with holes containing undefined', () => {
    const arr = ['users:read', undefined as unknown as string, 'team:list']
    expect(can(baseContext({ permissions: arr }), 'team:list')).toBe(true)
  })
  it('ignores getter that throws — falls back to filtered values', () => {
    const evil = {
      get permissions() {
        throw new Error('boom')
      },
    }
    expect(can(evil as unknown as AccessContext, 'users:read')).toBe(false)
  })
  it('handles proxy permissions that trap includes', () => {
    const proxied = new Proxy(baseContext(), {
      get(t, p) {
        if (p === 'permissions') return ['users:read']
        return (t as any)[p]
      },
    })
    expect(can(proxied, 'users:read')).toBe(true)
  })
  it('returns false when context has __proto__ as permission', () => {
    const ctx = baseContext({ permissions: ['__proto__' as string] })
    expect(can(ctx, '__proto__')).toBe(true)
    expect(can(ctx, 'users:read')).toBe(false)
  })
  it('does not get polluted via Object.prototype', () => {
    // classic proto pollution attempt
    const payload = JSON.parse('{"__proto__": {"permissions": ["pwned"]}}')
    const ctx = { ...baseContext(), ...payload } as unknown as AccessContext
    expect(can(ctx, 'pwned')).toBe(false)
  })
  it('handles Object.create(null) context with no prototype', () => {
    const ctx = Object.create(null) as AccessContext
    ;(ctx as any).permissions = ['users:read']
    expect(can(ctx, 'users:read')).toBe(true)
  })
  it('handles frozen context', () => {
    const ctx = Object.freeze(baseContext())
    expect(can(ctx, 'users:read')).toBe(true)
  })
  it('handles permissions as non-array object with length', () => {
    const fake = { 0: 'users:read', length: 1 } as unknown as string[]
    expect(can(baseContext({ permissions: fake }), 'users:read')).toBe(false)
  })
  it('handles Uint8Array as permissions (not an Array)', () => {
    const arr = new Uint8Array([1, 2]) as unknown as string[]
    expect(can(baseContext({ permissions: arr }), 'users:read')).toBe(false)
  })
  it('returns false when permissions contain symbol entries', () => {
    const perms = ['users:read', Symbol('team:list') as unknown as string]
    expect(can(baseContext({ permissions: perms }), 'team:list')).toBe(false)
  })
  it('returns false when context is a number', () => {
    expect(can(42 as unknown as AccessContext, 'users:read')).toBe(false)
  })
  it('returns false when context is a string', () => {
    expect(can('hello' as unknown as AccessContext, 'users:read')).toBe(false)
  })
  it('returns false when context is a function', () => {
    expect(can((() => {}) as unknown as AccessContext, 'users:read')).toBe(
      false
    )
  })
  it('handles permissions array with duplicate entries', () => {
    expect(
      can(
        baseContext({ permissions: ['users:read', 'users:read'] }),
        'users:read'
      )
    ).toBe(true)
  })
  it('does not coerce numeric permission in array (42 vs "42")', () => {
    expect(
      can(baseContext({ permissions: [42 as unknown as string] }), '42')
    ).toBe(false)
  })
  it('handles permission checking with \u202e RTL override', () => {
    expect(
      can(
        baseContext({ permissions: ['users\u202e:read'] }),
        'users\u202e:read'
      )
    ).toBe(true)
  })
  it('handles context with getter for permissions returning mutated array each call', () => {
    let calls = 0
    const ctx = {
      subject: { userId: 'x' },
      get permissions() {
        calls++
        return calls === 1 ? [] : ['users:read']
      },
      features: [],
      experiments: {},
    } as unknown as AccessContext
    expect(can(ctx, 'users:read')).toBe(false)
  })
})

describe('hasFeature — weird edge cases', () => {
  it('is case-sensitive for features', () => {
    expect(
      hasFeature(baseContext({ features: ['MyFeature'] }), 'myfeature')
    ).toBe(false)
  })
  it('rejects empty feature key even when array contains empty string', () => {
    expect(hasFeature(baseContext({ features: ['', 'f_one'] }), '')).toBe(false)
  })
  it('does not trim feature', () => {
    expect(hasFeature(baseContext({ features: ['f_one'] }), ' f_one ')).toBe(
      false
    )
  })
  it('handles null feature', () => {
    expect(hasFeature(baseContext(), null as unknown as string)).toBe(false)
  })
  it('handles numeric feature', () => {
    expect(hasFeature(baseContext(), 123 as unknown as string)).toBe(false)
  })
  it('handles symbol feature', () => {
    expect(
      hasFeature(baseContext(), Symbol('f_one') as unknown as string)
    ).toBe(false)
  })
  it('handles feature with null char (exact match returns true)', () => {
    expect(
      hasFeature(baseContext({ features: ['f\u0000_one'] }), 'f\u0000_one')
    ).toBe(true)
  })
  it('handles 10k feature keys', () => {
    const big = 'x'.repeat(10000)
    expect(hasFeature(baseContext({ features: [big] }), big)).toBe(true)
  })
  it('returns false when features is a string not array', () => {
    expect(
      hasFeature(
        { ...baseContext(), features: 'f_one' as unknown as string[] },
        'f_one'
      )
    ).toBe(false)
  })
  it('returns false when features is an object with length', () => {
    const fake = { 0: 'f_one', length: 1 } as unknown as string[]
    expect(hasFeature(baseContext({ features: fake }), 'f_one')).toBe(false)
  })
  it('ignores non-string entries in features array', () => {
    const weird = [
      'f_one',
      123 as unknown as string,
      null as unknown as string,
      { toString: () => 'f_one' } as unknown as string,
    ]
    expect(hasFeature(baseContext({ features: weird }), 'f_one')).toBe(true)
  })
  it('handles Object.create(null) context for features', () => {
    const ctx = Object.create(null) as AccessContext
    ;(ctx as any).features = ['f_one']
    expect(hasFeature(ctx, 'f_one')).toBe(true)
  })
  it('handles frozen features array', () => {
    expect(
      hasFeature(baseContext({ features: Object.freeze(['f_one']) }), 'f_one')
    ).toBe(true)
  })
  it('handles prototype-polluted features via __proto__', () => {
    const ctx = baseContext({ features: ['__proto__' as unknown as string] })
    expect(hasFeature(ctx, '__proto__')).toBe(true)
  })
  it('is vulnerable to Object.prototype pollution for features (current impl)', () => {
    // @ts-ignore
    Object.prototype.features = ['pwned']
    const result = hasFeature(
      { subject: { userId: 'x' } } as unknown as AccessContext,
      'pwned'
    )
    // @ts-ignore
    delete (Object.prototype as any).features
    expect(result).toBe(true)
  })
  it('handles Proxy for features', () => {
    const ctx = new Proxy(baseContext({ features: ['f_one'] }), {
      get(t, p) {
        if (p === 'features') return ['f_one']
        return (t as any)[p]
      },
    })
    expect(hasFeature(ctx, 'f_one')).toBe(true)
  })
  it('returns false for extremely long miss', () => {
    expect(hasFeature(baseContext(), 'a'.repeat(5000))).toBe(false)
  })
  it('handles sparse features array', () => {
    const sparse = Array(5) as unknown as string[]
    sparse[3] = 'f_one'
    expect(hasFeature(baseContext({ features: sparse }), 'f_one')).toBe(true)
  })
})

describe('variantOf — weird edge cases', () => {
  it('returns null for numeric experiment key', () => {
    expect(variantOf(baseContext(), 42 as unknown as string)).toBeNull()
  })
  it('returns null for null key', () => {
    expect(variantOf(baseContext(), null as unknown as string)).toBeNull()
  })
  it('returns null for symbol key', () => {
    expect(
      variantOf(baseContext(), Symbol('exp_a') as unknown as string)
    ).toBeNull()
  })
  it('returns null when experiments is null', () => {
    expect(
      variantOf(
        baseContext({ experiments: null as unknown as Record<string, string> }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('returns null when experiments is string', () => {
    expect(
      variantOf(
        baseContext({
          experiments: 'compact' as unknown as Record<string, string>,
        }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('returns null when experiments is number', () => {
    expect(
      variantOf(
        baseContext({ experiments: 123 as unknown as Record<string, string> }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('returns null when variant is number', () => {
    expect(
      variantOf(
        baseContext({ experiments: { exp_a: 123 as unknown as string } }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('returns null when variant is object', () => {
    expect(
      variantOf(
        baseContext({ experiments: { exp_a: {} as unknown as string } }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('returns null when variant is null', () => {
    expect(
      variantOf(
        baseContext({ experiments: { exp_a: null as unknown as string } }),
        'exp_a'
      )
    ).toBeNull()
  })
  it('handles empty string variant (is a string, returns it)', () => {
    expect(
      variantOf(baseContext({ experiments: { exp_a: '' } }), 'exp_a')
    ).toBe('')
  })
  it('is case-sensitive for experiment key', () => {
    expect(
      variantOf(baseContext({ experiments: { Exp_A: 'control' } }), 'exp_a')
    ).toBeNull()
  })
  it('does not trim experiment key', () => {
    expect(
      variantOf(baseContext({ experiments: { ' exp_a': 'control' } }), ' exp_a')
    ).toBe('control')
    expect(
      variantOf(baseContext({ experiments: { exp_a: 'control' } }), ' exp_a')
    ).toBeNull()
  })
  it('handles emoji experiment key', () => {
    expect(variantOf(baseContext({ experiments: { '😀': 'wow' } }), '😀')).toBe(
      'wow'
    )
  })
  it('handles 10k experiment key', () => {
    const k = 'k'.repeat(10000)
    expect(variantOf(baseContext({ experiments: { [k]: 'v' } }), k)).toBe('v')
  })
  it('returns null when experiments getter throws', () => {
    const ctx = {
      get experiments() {
        throw new Error('boom')
      },
      subject: { userId: 'x' },
      permissions: [],
      features: [],
    } as unknown as AccessContext
    expect(variantOf(ctx, 'exp_a')).toBeNull()
  })
  it('handles Object.create(null) experiments', () => {
    const ex = Object.create(null) as Record<string, string>
    ex['exp_a'] = 'control'
    expect(variantOf(baseContext({ experiments: ex }), 'exp_a')).toBe('control')
  })
  it('returns null for __proto__ experiments via literal (prototype setter, not own prop)', () => {
    const ctx = baseContext({
      experiments: { __proto__: 'polluted' } as unknown as Record<
        string,
        string
      >,
    })
    expect(variantOf(ctx, '__proto__')).toBeNull()
    expect(variantOf(baseContext(), 'polluted')).toBeNull()
  })
  it('does not return variant when experiments is frozen object with variant', () => {
    const ex = Object.freeze({ exp_a: 'frozen' })
    expect(variantOf(baseContext({ experiments: ex }), 'exp_a')).toBe('frozen')
  })
  it('returns null when context is number', () => {
    expect(variantOf(42 as unknown as AccessContext, 'exp_a')).toBeNull()
  })
  it('returns null when context is undefined', () => {
    expect(variantOf(undefined as unknown as AccessContext, 'exp_a')).toBeNull()
  })
  it('handles proxy trapping experiments', () => {
    const ctx = new Proxy(baseContext({ experiments: { exp_a: 'control' } }), {
      get(t, p) {
        if (p === 'subject') return { userId: 'x' }
        return (t as any)[p]
      },
    })
    expect(variantOf(ctx, 'exp_a')).toBe('control')
  })
  it('returns null for experiment key with null char', () => {
    expect(
      variantOf(baseContext({ experiments: { 'a\u0000b': 'v' } }), 'a\u0000b')
    ).toBe('v')
    expect(
      variantOf(baseContext({ experiments: { ab: 'v' } }), 'a\u0000b')
    ).toBeNull()
  })
})
