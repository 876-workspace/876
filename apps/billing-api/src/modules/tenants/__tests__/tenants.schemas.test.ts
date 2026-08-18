import { describe, expect, it } from 'vitest'
import {
  tenantCreateBodySchema,
  tenantLifecycleBodySchema,
} from '../tenants.schemas'

describe('tenantCreateBodySchema', () => {
  it('accepts valid body with defaults', () => {
    const result = tenantCreateBodySchema.parse({
      name: 'Test Org',
      slug: 'test-org',
    })
    expect(result).toEqual({
      name: 'Test Org',
      slug: 'test-org',
      defaultCurrency: 'JMD',
    })
  })

  it('uppercases defaultCurrency', () => {
    const result = tenantCreateBodySchema.parse({
      name: 'Test',
      slug: 'test-org',
      defaultCurrency: 'jmd',
    })
    expect(result.defaultCurrency).toBe('JMD')
  })

  it('trims name and slug', () => {
    const result = tenantCreateBodySchema.parse({
      name: '  Test  ',
      slug: '  test-org  ',
      defaultCurrency: 'jmd',
    })
    expect(result.name).toBe('Test')
    expect(result.slug).toBe('test-org')
  })

  it('rejects empty name', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: '', slug: 'test-org' })
    ).toThrow()
  })

  it('rejects name over 160 chars', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'a'.repeat(161), slug: 'test-org' })
    ).toThrow()
  })

  it('rejects slug with uppercase', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'Test-Org' })
    ).toThrow()
  })

  it('rejects slug with underscore', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'test_org' })
    ).toThrow()
  })

  it('rejects slug shorter than 2 chars', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'a' })
    ).toThrow()
  })

  it('rejects slug longer than 80 chars', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'a'.repeat(81) })
    ).toThrow()
  })

  it('accepts slug with exactly 2 chars', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'ab' })
    ).not.toThrow()
  })

  it('accepts slug with exactly 80 chars', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: 'Test', slug: 'a'.repeat(80) })
    ).not.toThrow()
  })

  it('rejects unknown fields (strict)', () => {
    expect(() =>
      tenantCreateBodySchema.parse({
        name: 'Test',
        slug: 'test-org',
        unknown: 'field',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })

  it('rejects non-3-char currency', () => {
    expect(() =>
      tenantCreateBodySchema.parse({
        name: 'Test',
        slug: 'test-org',
        defaultCurrency: 'JM',
      })
    ).toThrow()
  })

  it('trims currency and uppercases', () => {
    const result = tenantCreateBodySchema.parse({
      name: 'Test',
      slug: 'test-org',
      defaultCurrency: '  usd  ',
    })
    expect(result.defaultCurrency).toBe('USD')
  })

  it('rejects name with only whitespace', () => {
    expect(() =>
      tenantCreateBodySchema.parse({ name: '   ', slug: 'test-org' })
    ).toThrow()
  })
})

describe('tenantLifecycleBodySchema', () => {
  it('accepts archive with required fields', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
    })
    expect(result.organizationId).toBe('org_1')
    expect(result.action).toBe('archive')
  })

  it('accepts restore', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'restore',
    })
    expect(result.action).toBe('restore')
  })

  it('accepts archive with deletedBy and reason', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
      deletedBy: 'user_1',
      reason: 'deleted',
    })
    expect(result.deletedBy).toBe('user_1')
    expect(result.reason).toBe('deleted')
  })

  it('accepts null deletedBy and reason', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
      deletedBy: null,
      reason: null,
    })
    expect(result.deletedBy).toBeNull()
    expect(result.reason).toBeNull()
  })

  it('rejects empty organizationId', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({ organizationId: '', action: 'archive' })
    ).toThrow()
  })

  it('rejects organizationId over 191 chars', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'o'.repeat(192),
        action: 'archive',
      })
    ).toThrow()
  })

  it('rejects invalid action', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'org_1',
        action: 'invalid',
      })
    ).toThrow()
  })

  it('trims reason and enforces max 500', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
      reason: '  hello  ',
    })
    expect(result.reason).toBe('hello')
  })

  it('rejects reason over 500 chars', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'org_1',
        action: 'archive',
        reason: 'a'.repeat(501),
      })
    ).toThrow()
  })

  it('accepts reason with exactly 500 chars', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'org_1',
        action: 'archive',
        reason: 'a'.repeat(500),
      })
    ).not.toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'org_1',
        action: 'archive',
        unknown: 'x',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })

  it('rejects deletedBy over 191 chars', () => {
    expect(() =>
      tenantLifecycleBodySchema.parse({
        organizationId: 'org_1',
        action: 'archive',
        deletedBy: 'u'.repeat(192),
      })
    ).toThrow()
  })

  it('accepts deletedBy undefined (optional)', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
    })
    expect(result.deletedBy).toBeUndefined()
  })

  it('accepts whitespace-trimmed reason becomes empty string', () => {
    const result = tenantLifecycleBodySchema.parse({
      organizationId: 'org_1',
      action: 'archive',
      reason: '   ',
    })
    expect(result.reason).toBe('')
  })
})
