import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db/client', () => ({ prisma: {} }))

import { provisionTenantWorkspace } from '../tenants.repository'

const input = {
  organizationId: 'org_invoice_first',
  name: 'Test Org',
  slug: 'test-org',
  defaultCurrency: 'JMD',
  superAdminUserId: 'user_super_admin',
  now: 1_786_962_851,
}

function createExistingWorkspaceTx(options?: {
  member?: { id: string; roleId: string; status: string } | null
  ownerRole?: { id: string } | null
}) {
  const member = options?.member ?? null
  const ownerRole =
    options?.ownerRole === undefined ? { id: 'role_owner' } : options.ownerRole

  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'ten_shared_finance',
        provisioningVersion: 3,
      }),
    },
    role: {
      findFirst: vi.fn().mockResolvedValue(ownerRole),
      create: vi.fn(async ({ data }: { data: { id: string } }) => ({
        id: data.id,
      })),
    },
    member: {
      findFirst: vi.fn().mockResolvedValue(member),
      create: vi.fn(async ({ data }: { data: unknown }) => data),
      update: vi.fn(async ({ data }: { data: unknown }) => data),
    },
  }
}

describe('finance-created workspace Billing upgrade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('seats the Billing super admin when the shared finance workspace already exists', async () => {
    const tx = createExistingWorkspaceTx()

    const result = await provisionTenantWorkspace(tx as never, input)

    expect(result).toEqual({
      id: 'ten_shared_finance',
      created: false,
      provisioningVersion: 3,
    })
    expect(tx.member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_shared_finance',
        userId: 'user_super_admin',
        roleId: 'role_owner',
        status: 'ACTIVE',
      }),
    })
  })

  it('reactivates and restores the super admin role for an existing member grant', async () => {
    const tx = createExistingWorkspaceTx({
      member: { id: 'mem_owner', roleId: 'role_viewer', status: 'SUSPENDED' },
    })

    await provisionTenantWorkspace(tx as never, input)

    expect(tx.member.create).not.toHaveBeenCalled()
    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'mem_owner' },
      data: {
        roleId: 'role_owner',
        status: 'ACTIVE',
        updatedAt: input.now,
      },
    })
  })

  it('self-heals a missing super admin role before seating the super admin', async () => {
    const tx = createExistingWorkspaceTx({ ownerRole: null })

    await provisionTenantWorkspace(tx as never, input)

    expect(tx.role.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_shared_finance',
        slug: 'super-admin',
        isSystem: true,
      }),
      select: { id: true },
    })
    expect(tx.member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_shared_finance',
        userId: 'user_super_admin',
        status: 'ACTIVE',
      }),
    })
  })
})
