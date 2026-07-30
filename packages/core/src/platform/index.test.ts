import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876PlatformClient } from './index'

describe('create876PlatformClient', () => {
  it('exposes resource-first privileged bootstrap operations', () => {
    const $876 = create876PlatformClient({
      fetch: vi.fn<typeof fetch>(),
      internalKey: 'test-internal-key',
    })

    expect($876.organizations.retrieve).toBeTypeOf('function')
    expect($876.memberships.list).toBeTypeOf('function')
    expect($876.memberships.listRouting).toBeTypeOf('function')
    expect($876.invites.create).toBeTypeOf('function')
    expect($876.subscriptions.provision).toBeTypeOf('function')
    expect($876.regions.list).toBeTypeOf('function')
    expect($876.identifications.disclose).toBeTypeOf('function')

    expect('auth' in $876).toBe(false)
    expect('geo' in $876).toBe(false)
    expect('orgs' in $876).toBe(false)
  })
})
