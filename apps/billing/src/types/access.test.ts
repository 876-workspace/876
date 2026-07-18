import { describe, expect, it } from 'vitest'

import { togglePermission } from '@/lib/permissions'

import { RoleCreateSchema, RoleUpdateSchema, type Permission } from './access'

describe('Billing role contracts', () => {
  it('requires Billing access on every custom role', () => {
    const result = RoleCreateSchema.safeParse({
      slug: 'report_reader',
      name: 'Report reader',
      permissions: ['reports:read'],
    })
    expect(result.success).toBe(false)
  })

  it('requires matching read permission for writes', () => {
    const result = RoleCreateSchema.safeParse({
      slug: 'tax_manager',
      name: 'Tax manager',
      permissions: ['billing:access', 'taxes:write'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a least-privilege read/write role', () => {
    const result = RoleCreateSchema.safeParse({
      slug: 'tax_manager',
      name: 'Tax manager',
      permissions: ['billing:access', 'taxes:read', 'taxes:write'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty role updates', () => {
    expect(RoleUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('adds read with write and removes write with read', () => {
    const initial = new Set<Permission>(['billing:access'])
    const withWrite = togglePermission(initial, 'sales:write')
    expect(withWrite).toEqual(
      new Set(['billing:access', 'sales:write', 'sales:read'])
    )

    const withoutRead = togglePermission(withWrite, 'sales:read')
    expect(withoutRead).toEqual(new Set(['billing:access']))
  })

  it('does not allow the editor to remove Billing access', () => {
    const selected = new Set<Permission>(['billing:access'])
    expect(togglePermission(selected, 'billing:access')).toEqual(selected)
  })
})
