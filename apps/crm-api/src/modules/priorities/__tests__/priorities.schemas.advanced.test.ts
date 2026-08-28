import { describe, expect, it } from 'vitest'

import {
  createPriorityBodySchema,
  deletePriorityBodySchema,
  listPrioritiesQuerySchema,
  organizationParamsSchema,
  priorityParamsSchema,
  updatePriorityBodySchema,
} from '../priorities.schemas.js'

describe('priorities.schemas.advanced - organizationParamsSchema', () => {
  it('trims and requires organizationId', () => {
    expect(
      organizationParamsSchema.parse({ organizationId: '  org_1  ' })
    ).toEqual({ organizationId: 'org_1' })
    expect(() =>
      organizationParamsSchema.parse({ organizationId: '' })
    ).toThrow()
    expect(() =>
      organizationParamsSchema.parse({} as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() =>
      organizationParamsSchema.parse({
        organizationId: 'org_1',
        extra: 1,
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})

describe('priorities.schemas.advanced - priorityParamsSchema', () => {
  it('requires both organizationId and priorityId trimmed', () => {
    expect(
      priorityParamsSchema.parse({
        organizationId: ' org_1 ',
        priorityId: ' pri_1 ',
      })
    ).toEqual({
      organizationId: 'org_1',
      priorityId: 'pri_1',
    })
    expect(() =>
      priorityParamsSchema.parse({
        organizationId: 'org_1',
      } as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() =>
      priorityParamsSchema.parse({ organizationId: 'org_1', priorityId: '' })
    ).toThrow()
  })
})

describe('priorities.schemas.advanced - createPriorityBodySchema boundaries', () => {
  const base = { name: 'Critical', createdBy: 'usr_1' }

  it('trims name and description and accepts max lengths', () => {
    expect(
      createPriorityBodySchema.parse({ ...base, name: '  Critical  ' }).name
    ).toBe('Critical')
    expect(
      createPriorityBodySchema.parse({ ...base, name: 'a'.repeat(120) }).name
    ).toHaveLength(120)
    expect(() =>
      createPriorityBodySchema.parse({ ...base, name: 'a'.repeat(121) })
    ).toThrow()
    expect(
      createPriorityBodySchema.parse({ ...base, description: '  hello  ' })
        .description
    ).toBe('hello')
    expect(() =>
      createPriorityBodySchema.parse({ ...base, description: 'a'.repeat(1001) })
    ).toThrow()
  })

  it('validates color/icon lengths and accepts null', () => {
    expect(
      createPriorityBodySchema.parse({ ...base, color: null }).color
    ).toBeNull()
    expect(
      createPriorityBodySchema.parse({ ...base, icon: null }).icon
    ).toBeNull()
    expect(() =>
      createPriorityBodySchema.parse({ ...base, color: 'a'.repeat(101) })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({ ...base, icon: 'a'.repeat(41) })
    ).toThrow()
    expect(
      createPriorityBodySchema.parse({ ...base, color: ' #fff ' }).color
    ).toBe('#fff')
    expect(
      createPriorityBodySchema.parse({ ...base, icon: '  alert  ' }).icon
    ).toBe('alert')
  })

  it('validates weight and sortOrder integer 0..1_000_000', () => {
    expect(createPriorityBodySchema.parse({ ...base, weight: 0 }).weight).toBe(
      0
    )
    expect(
      createPriorityBodySchema.parse({ ...base, weight: 1_000_000 }).weight
    ).toBe(1_000_000)
    expect(() =>
      createPriorityBodySchema.parse({ ...base, weight: -1 })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({ ...base, weight: 1_000_001 })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({ ...base, weight: 1.5 })
    ).toThrow()
    expect(
      createPriorityBodySchema.parse({ ...base, sortOrder: 42 }).sortOrder
    ).toBe(42)
    expect(() =>
      createPriorityBodySchema.parse({ ...base, sortOrder: -1 })
    ).toThrow()
  })

  it('accepts boolean flags and trims createdBy', () => {
    expect(
      createPriorityBodySchema.parse({ ...base, isDefault: true }).isDefault
    ).toBe(true)
    expect(
      createPriorityBodySchema.parse({ ...base, isActive: false }).isActive
    ).toBe(false)
    expect(
      createPriorityBodySchema.parse({ name: 'X', createdBy: '  usr_1  ' })
        .createdBy
    ).toBe('usr_1')
    expect(() =>
      createPriorityBodySchema.parse({ name: 'X' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })

  it('rejects unknown fields and empty name', () => {
    expect(() =>
      createPriorityBodySchema.parse({
        ...base,
        unknown: 1,
      } as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({ name: '', createdBy: 'usr_1' })
    ).toThrow()
    expect(() =>
      createPriorityBodySchema.parse({ name: '   ', createdBy: 'usr_1' })
    ).toThrow()
  })
})

describe('priorities.schemas.advanced - updatePriorityBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => updatePriorityBodySchema.parse({})).toThrow()
  })

  it('accepts partial fields and enforces same limits as create', () => {
    expect(updatePriorityBodySchema.parse({ name: '  Urgent  ' }).name).toBe(
      'Urgent'
    )
    expect(() => updatePriorityBodySchema.parse({ name: '' })).toThrow()
    expect(() =>
      updatePriorityBodySchema.parse({ weight: 2_000_000 })
    ).toThrow()
    expect(updatePriorityBodySchema.parse({ color: null }).color).toBeNull()
    expect(updatePriorityBodySchema.parse({ isDefault: true }).isDefault).toBe(
      true
    )
    expect(updatePriorityBodySchema.parse({ isActive: false }).isActive).toBe(
      false
    )
  })

  it('rejects unknown fields', () => {
    expect(() =>
      updatePriorityBodySchema.parse({ unknown: 1 } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })

  it('allows clearing optional fields with null', () => {
    expect(
      updatePriorityBodySchema.parse({ description: null }).description
    ).toBeNull()
    expect(updatePriorityBodySchema.parse({ color: null }).color).toBeNull()
    expect(updatePriorityBodySchema.parse({ icon: null }).icon).toBeNull()
  })
})

describe('priorities.schemas.advanced - deletePriorityBodySchema', () => {
  it('requires trimmed deletedBy', () => {
    expect(deletePriorityBodySchema.parse({ deletedBy: '  usr_1  ' })).toEqual({
      deletedBy: 'usr_1',
    })
    expect(() =>
      deletePriorityBodySchema.parse({} as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() => deletePriorityBodySchema.parse({ deletedBy: '' })).toThrow()
    expect(() =>
      deletePriorityBodySchema.parse({
        deletedBy: 'usr_1',
        extra: 1,
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})

describe('priorities.schemas.advanced - listPrioritiesQuerySchema', () => {
  it('parses boolean strings and leaves undefined', () => {
    expect(listPrioritiesQuerySchema.parse({})).toEqual({})
    expect(listPrioritiesQuerySchema.parse({ active: 'true' })).toEqual({
      active: true,
    })
    expect(listPrioritiesQuerySchema.parse({ active: 'false' })).toEqual({
      active: false,
    })
  })

  it('rejects invalid active values and unknown fields', () => {
    expect(() => listPrioritiesQuerySchema.parse({ active: 'True' })).toThrow()
    expect(() =>
      listPrioritiesQuerySchema.parse({ active: true as unknown as string })
    ).toThrow()
    expect(() =>
      listPrioritiesQuerySchema.parse({ unknown: 1 } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })
})
