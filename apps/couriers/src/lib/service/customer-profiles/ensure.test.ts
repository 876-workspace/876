import { beforeEach, describe, expect, it, vi } from 'vitest'

const { profile, prisma } = vi.hoisted(() => {
  const profile = {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  }
  return {
    profile,
    prisma: {
      $transaction: vi.fn((callback) =>
        callback({ courierCustomerProfile: profile })
      ),
    },
  }
})

vi.mock('@/lib/db', () => ({ prisma }))

import { ensure } from './ensure'

const params = {
  tenantId: 'ten_1',
  userId: 'usr_1',
  billingCustomerId: 'cus_shared',
  mailboxNumber: '1001',
}

describe('customerProfiles.ensure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profile.create.mockResolvedValue({ id: 'cprof_1', ...params })
    profile.update.mockResolvedValue({ id: 'cprof_1', ...params })
  })

  it('creates an operational profile and mailbox for a shared customer', async () => {
    profile.findFirst.mockResolvedValue(null)

    await ensure(params)

    expect(profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_1',
        userId: 'usr_1',
        billingCustomerId: 'cus_shared',
        mailboxes: {
          create: expect.objectContaining({
            tenantId: 'ten_1',
            number: '1001',
            isPrimary: true,
          }),
        },
      }),
    })
  })

  it('backfills a missing Billing reference without replacing operational data', async () => {
    profile.findFirst.mockResolvedValue({
      id: 'cprof_1',
      billingCustomerId: null,
    })

    await ensure(params)

    expect(profile.update).toHaveBeenCalledWith({
      where: { id: 'cprof_1' },
      data: expect.objectContaining({ billingCustomerId: 'cus_shared' }),
    })
    expect(profile.create).not.toHaveBeenCalled()
  })

  it('refuses to relink a profile to a different Billing customer', async () => {
    profile.findFirst.mockResolvedValue({
      id: 'cprof_1',
      billingCustomerId: 'cus_original',
    })

    await expect(ensure(params)).rejects.toThrow(
      'already linked to another Billing customer'
    )
    expect(profile.update).not.toHaveBeenCalled()
    expect(profile.create).not.toHaveBeenCalled()
  })

  it('revives a soft-deleted profile without reallocating its mailbox', async () => {
    profile.findFirst.mockResolvedValue({
      id: 'cprof_1',
      billingCustomerId: 'cus_shared',
      deletedAt: 1_785_427_200,
      deletedBy: 'usr_ops',
      deletionReason: 'Requested by customer',
      mailboxNumber: '1001',
      branchId: 'br_kingston',
      trn: '123-456-789',
      isCommercial: true,
    })

    await ensure(params)

    expect(profile.create).not.toHaveBeenCalled()
    expect(profile.update).toHaveBeenCalledWith({
      where: { id: 'cprof_1' },
      data: expect.objectContaining({
        billingCustomerId: 'cus_shared',
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      }),
    })
    expect(profile.update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        data: expect.objectContaining({ mailboxNumber: expect.anything() }),
      })
    )
  })
})
