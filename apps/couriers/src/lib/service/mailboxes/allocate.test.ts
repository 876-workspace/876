import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tenant } from '@/lib/db'

type MockPrismaClient = {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>
  }
  mailbox: {
    count: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { allocate } from './allocate'

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'ten_rocketship',
    orgId: 'org_rocketship',
    slug: 'rocketship',
    name: 'Rocketship Couriers Jamaica',
    mailboxPrefix: 'RSJ',
    status: 'ACTIVE',
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('mailboxes.allocate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      tenant: { findUnique: vi.fn().mockResolvedValue(null) },
      mailbox: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    }
  })

  it.each([
    ['a null prefix', null, '1001'],
    ['a whitespace prefix', '  \t ', '1001'],
    ['a lowercase padded prefix', '  rsj  ', 'RSJ1001'],
  ] as const)(
    'normalizes %s for the first allocation',
    async (_case, prefix, number) => {
      const tenantFindUnique = mockPrismaRef.current!.tenant.findUnique
      const mailboxCount = mockPrismaRef.current!.mailbox.count
      const mailboxFindUnique = mockPrismaRef.current!.mailbox.findUnique
      tenantFindUnique.mockResolvedValue(
        createTenant({ mailboxPrefix: prefix })
      )

      const result = await allocate({ tenantId: 'ten_rocketship' })

      expect(result).toEqual({ data: { number }, error: null })
      expect(tenantFindUnique).toHaveBeenCalledTimes(1)
      expect(tenantFindUnique).toHaveBeenCalledWith({
        where: { id: 'ten_rocketship' },
        select: { mailboxPrefix: true },
      })
      expect(mailboxCount).toHaveBeenCalledTimes(1)
      expect(mailboxCount).toHaveBeenCalledWith({
        where: { tenantId: 'ten_rocketship' },
      })
      expect(mailboxFindUnique).toHaveBeenCalledTimes(1)
      expect(mailboxFindUnique).toHaveBeenCalledWith({
        where: {
          mailboxes_tenant_id_number_key: {
            tenantId: 'ten_rocketship',
            number,
          },
        },
        select: { id: true },
      })
    }
  )

  it('advances from the tenant mailbox count before probing availability', async () => {
    const tenantFindUnique = mockPrismaRef.current!.tenant.findUnique
    const mailboxCount = mockPrismaRef.current!.mailbox.count
    const mailboxFindUnique = mockPrismaRef.current!.mailbox.findUnique
    tenantFindUnique.mockResolvedValue(createTenant())
    mailboxCount.mockResolvedValue(9)

    const result = await allocate({ tenantId: 'ten_rocketship' })

    expect(result).toEqual({ data: { number: 'RSJ1010' }, error: null })
    expect(mailboxCount).toHaveBeenCalledTimes(1)
    expect(mailboxCount).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship' },
    })
    expect(mailboxFindUnique).toHaveBeenCalledTimes(1)
    expect(mailboxFindUnique).toHaveBeenCalledWith({
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_rocketship',
          number: 'RSJ1010',
        },
      },
      select: { id: true },
    })
  })

  it('probes the next candidate after a collision', async () => {
    const tenantFindUnique = mockPrismaRef.current!.tenant.findUnique
    const mailboxFindUnique = mockPrismaRef.current!.mailbox.findUnique
    tenantFindUnique.mockResolvedValue(createTenant())
    mailboxFindUnique
      .mockResolvedValueOnce({ id: 'mbx_rsj1001' })
      .mockResolvedValueOnce(null)

    const result = await allocate({ tenantId: 'ten_rocketship' })

    expect(result).toEqual({ data: { number: 'RSJ1002' }, error: null })
    expect(mailboxFindUnique).toHaveBeenCalledTimes(2)
    expect(mailboxFindUnique).toHaveBeenNthCalledWith(1, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_rocketship',
          number: 'RSJ1001',
        },
      },
      select: { id: true },
    })
    expect(mailboxFindUnique).toHaveBeenNthCalledWith(2, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_rocketship',
          number: 'RSJ1002',
        },
      },
      select: { id: true },
    })
  })

  it('returns the exact unavailable error after all 25 candidates collide', async () => {
    const tenantFindUnique = mockPrismaRef.current!.tenant.findUnique
    const mailboxFindUnique = mockPrismaRef.current!.mailbox.findUnique
    tenantFindUnique.mockResolvedValue(createTenant())
    mailboxFindUnique.mockResolvedValue({ id: 'mbx_collision' })

    const result = await allocate({ tenantId: 'ten_rocketship' })

    expect(result).toEqual({
      data: null,
      error: 'A mailbox number could not be allocated. Please try again.',
      status: 503,
    })
    expect(mailboxFindUnique).toHaveBeenCalledTimes(25)
    expect(mailboxFindUnique).toHaveBeenNthCalledWith(1, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_rocketship',
          number: 'RSJ1001',
        },
      },
      select: { id: true },
    })
    expect(mailboxFindUnique).toHaveBeenNthCalledWith(25, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_rocketship',
          number: 'RSJ1025',
        },
      },
      select: { id: true },
    })
  })

  it('returns a 404-style error when the tenant does not exist', async () => {
    const tenantFindUnique = mockPrismaRef.current!.tenant.findUnique
    const mailboxCount = mockPrismaRef.current!.mailbox.count
    const mailboxFindUnique = mockPrismaRef.current!.mailbox.findUnique

    const result = await allocate({ tenantId: 'ten_missing' })

    expect(result).toEqual({
      data: null,
      error: 'The requested tenant was not found.',
      status: 404,
    })
    expect(tenantFindUnique).toHaveBeenCalledTimes(1)
    expect(tenantFindUnique).toHaveBeenCalledWith({
      where: { id: 'ten_missing' },
      select: { mailboxPrefix: true },
    })
    expect(mailboxCount).not.toHaveBeenCalled()
    expect(mailboxFindUnique).not.toHaveBeenCalled()
  })
})
