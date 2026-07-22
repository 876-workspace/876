import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockTx = {
  tenant: { create: ReturnType<typeof vi.fn> }
  role: { findUnique: ReturnType<typeof vi.fn> }
  teamMember: { create: ReturnType<typeof vi.fn> }
}

const mocks = vi.hoisted(() => ({
  ensureDefaults: vi.fn(),
  transaction: vi.fn(),
}))

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: {
    current: null as {
      $transaction: ReturnType<typeof vi.fn>
    } | null,
  },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('../roles', () => ({
  roles: { ensureDefaults: mocks.ensureDefaults },
}))

import { create } from './create'

const NOW = Math.floor(new Date('2026-07-21T12:00:00Z').getTime() / 1000)

function createTx(): MockTx {
  return {
    tenant: {
      create: vi.fn().mockResolvedValue({
        id: 'ten_rocketship',
        orgId: 'org_123',
        slug: 'rocketship',
        name: 'Rocketship Couriers',
        domains: [],
      }),
    },
    role: {
      findUnique: vi.fn().mockResolvedValue({ id: 'role_admin' }),
    },
    teamMember: {
      create: vi.fn().mockResolvedValue({ id: 'tmem_owner' }),
    },
  }
}

describe('service.tenants.create', () => {
  let tx: MockTx

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    tx = createTx()
    mocks.ensureDefaults.mockResolvedValue(undefined)
    mocks.transaction.mockImplementation(
      async (callback: (client: MockTx) => Promise<unknown>) => callback(tx)
    )
    mockPrismaRef.current = {
      $transaction: mocks.transaction,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates the tenant, seeds default roles, and returns the tenant id', async () => {
    const result = await create({
      orgId: 'org_123',
      name: 'Rocketship Couriers',
      slug: 'rocketship',
    })

    expect(result).toEqual({
      data: { id: 'ten_rocketship' },
      error: null,
    })
    expect(tx.tenant.create).toHaveBeenCalledTimes(1)
    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org_123',
        slug: 'rocketship',
        name: 'Rocketship Couriers',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
        domains: {
          create: {
            hostname: 'rocketship.couriers.876.app',
            isPrimary: true,
            verified: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      },
      include: { domains: true },
    })
    expect(mocks.ensureDefaults).toHaveBeenCalledTimes(1)
    expect(mocks.ensureDefaults).toHaveBeenCalledWith('ten_rocketship', tx)
    expect(tx.role.findUnique).not.toHaveBeenCalled()
    expect(tx.teamMember.create).not.toHaveBeenCalled()
  })

  it('grants the owner the Admin team role when ownerUserId is provided', async () => {
    const result = await create({
      orgId: 'org_123',
      name: 'Rocketship Couriers',
      slug: 'rocketship',
      ownerUserId: 'usr_owner',
    })

    expect(result).toEqual({
      data: { id: 'ten_rocketship' },
      error: null,
    })
    expect(mocks.ensureDefaults).toHaveBeenCalledWith('ten_rocketship', tx)
    expect(tx.role.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: {
        roles_tenant_id_system_key_key: {
          tenantId: 'ten_rocketship',
          systemKey: 'admin',
        },
      },
      select: { id: true },
    })
    expect(tx.teamMember.create).toHaveBeenCalledTimes(1)
    expect(tx.teamMember.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_rocketship',
        userId: 'usr_owner',
        roleId: 'role_admin',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('fails the transaction when Admin role provisioning is incomplete', async () => {
    tx.role.findUnique.mockResolvedValue(null)

    const result = await create({
      orgId: 'org_123',
      name: 'Rocketship Couriers',
      slug: 'rocketship',
      ownerUserId: 'usr_owner',
    })

    expect(result).toEqual({
      data: null,
      error: 'Failed to create tenant.',
      status: 500,
    })
    expect(tx.teamMember.create).not.toHaveBeenCalled()
  })

  it('maps unique-constraint failures to a subdomain conflict', async () => {
    mocks.transaction.mockRejectedValue(
      new Error('Unique constraint failed on the fields: (`slug`)')
    )

    const result = await create({
      orgId: 'org_123',
      name: 'Rocketship Couriers',
      slug: 'rocketship',
    })

    expect(result).toEqual({
      data: null,
      error: 'That subdomain is already taken. Please choose another.',
      status: 409,
    })
  })

  it('returns a generic 500 for unexpected failures', async () => {
    mocks.transaction.mockRejectedValue(new Error('disk full'))

    const result = await create({
      orgId: 'org_123',
      name: 'Rocketship Couriers',
      slug: 'rocketship',
    })

    expect(result).toEqual({
      data: null,
      error: 'Failed to create tenant.',
      status: 500,
    })
  })
})
