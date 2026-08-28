import { describe, expect, it } from 'vitest'
import { create, update, deletion } from '../categories.schemas.js'

describe('categories.schemas - create', () => {
  const base = { name: 'Delivery', createdBy: 'usr_1' }

  it('parses minimal', () => {
    expect(create.parse(base)).toMatchObject({
      name: 'Delivery',
      createdBy: 'usr_1',
    })
  })

  it('trims name and rejects empty', () => {
    expect(create.parse({ ...base, name: '  Ops  ' }).name).toBe('Ops')
    expect(() => create.parse({ ...base, name: '' })).toThrow()
    expect(() => create.parse({ ...base, name: '   ' })).toThrow()
  })

  it('enforces name max 120', () => {
    expect(() => create.parse({ ...base, name: 'a'.repeat(121) })).toThrow()
    expect(create.parse({ ...base, name: 'a'.repeat(120) }).name).toHaveLength(
      120
    )
  })

  it('accepts all optional fields including a configured priority id', () => {
    const parsed = create.parse({
      ...base,
      description: 'Cat',
      color: '#fff',
      icon: 'bug',
      sortOrder: 5,
      isActive: false,
      defaultTeamId: 'crm_team_1',
      defaultPriorityId: 'crm_pri_high',
    })
    expect(parsed.description).toBe('Cat')
    expect(parsed.icon).toBe('bug')
    expect(parsed.sortOrder).toBe(5)
    expect(parsed.isActive).toBe(false)
    expect(parsed.defaultTeamId).toBe('crm_team_1')
    expect(parsed.defaultPriorityId).toBe('crm_pri_high')
  })

  it('accepts unknown icon keys (presentation back-compat)', () => {
    expect(create.parse({ ...base, icon: 'ladybug' }).icon).toBe('ladybug')
    expect(create.parse({ ...base, icon: null }).icon).toBeNull()
  })

  it('rejects an empty priority id', () => {
    expect(() => create.parse({ ...base, defaultPriorityId: '' })).toThrow()
  })

  it('accepts null defaults', () => {
    expect(
      create.parse({ ...base, defaultTeamId: null }).defaultTeamId
    ).toBeNull()
    expect(
      create.parse({ ...base, defaultPriorityId: null }).defaultPriorityId
    ).toBeNull()
  })

  it('rejects the removed defaultPriority enum field', () => {
    expect(() =>
      create.parse({ ...base, defaultPriority: 'HIGH' })
    ).toThrow()
  })

  it('trims description and enforces max 1000', () => {
    expect(
      create.parse({ ...base, description: '  hello  ' }).description
    ).toBe('hello')
    expect(() =>
      create.parse({ ...base, description: 'a'.repeat(1001) })
    ).toThrow()
  })

  it('rejects missing createdBy', () => {
    expect(() => create.parse({ name: 'X' })).toThrow()
  })
})

describe('categories.schemas - update', () => {
  it('requires at least one field', () => {
    expect(() => update.parse({})).toThrow()
  })

  it('accepts partial', () => {
    expect(update.parse({ name: 'New' }).name).toBe('New')
    expect(update.parse({ sortOrder: 2 }).sortOrder).toBe(2)
  })

  it('allows clearing defaults with null', () => {
    expect(update.parse({ defaultTeamId: null }).defaultTeamId).toBeNull()
    expect(update.parse({ defaultPriorityId: null }).defaultPriorityId).toBeNull()
  })

  it('trims name on update', () => {
    expect(update.parse({ name: '  New  ' }).name).toBe('New')
    expect(() => update.parse({ name: '' })).toThrow()
  })
})

describe('categories.schemas - deletion', () => {
  it('requires deletedBy', () => {
    expect(deletion.parse({ deletedBy: 'usr_1' })).toEqual({
      deletedBy: 'usr_1',
    })
    expect(() => deletion.parse({})).toThrow()
    expect(() => deletion.parse({ deletedBy: '' })).toThrow()
  })

  it('accepts optional reason', () => {
    expect(deletion.parse({ deletedBy: 'usr_1', reason: 'dup' }).reason).toBe(
      'dup'
    )
  })
})
