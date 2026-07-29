import { describe, expect, it, vi } from 'vitest'

import { create876Client } from './index'

describe('create876Client', () => {
  it('composes platform, Billing, and safe Widgets namespaces', () => {
    const $876 = create876Client({
      fetch: vi.fn<typeof fetch>(),
      billing: { fetch: vi.fn<typeof fetch>() },
    })

    expect($876.auth).toBeDefined()
    expect($876.organizations).toBeDefined()
    expect($876.memberships).toBeDefined()
    expect($876.billing.invoices).toBeDefined()
    expect($876.widgets.notes.list).toBeTypeOf('function')
    expect($876.widgets.collections.list).toBeTypeOf('function')
  })

  it('does not expose browser admin or server-only namespaces', () => {
    const $876 = create876Client()

    expect('adminDelete' in $876.widgets.notes).toBe(false)
    expect('storage' in $876).toBe(false)
    expect('create' in $876.users).toBe(false)
    expect('orgs' in $876).toBe(false)
  })
})
