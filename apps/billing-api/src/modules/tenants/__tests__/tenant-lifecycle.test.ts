import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
    },
  },
}))

import {
  archiveTenantRowForOrganization,
  restoreTenantRowForOrganization,
} from '../tenants.repository'

const NOW = 1_786_963_053

describe('archiveTenantRowForOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({
      id: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: NOW,
    })
  })

  it('suspends the workspace and records the tombstone', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })

    const result = await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: 'user_admin',
      reason: 'organization deleted',
      now: NOW,
    })

    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'ten_1' },
      data: {
        status: 'SUSPENDED',
        deletedAt: NOW,
        deletedBy: 'user_admin',
        deletionReason: 'organization deleted',
        updatedAt: NOW,
      },
      select: { id: true, status: true, deletedAt: true },
    })
    expect(result).toEqual({ id: 'ten_1', status: 'SUSPENDED', deletedAt: NOW })
  })

  it('keeps the first tombstone when a purge follows a delete', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 1_000 })

    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: 'user_other',
      reason: 'organization purged',
      now: NOW,
    })

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'SUSPENDED',
          deletedAt: 1_000,
          deletedBy: undefined,
          deletionReason: undefined,
          updatedAt: NOW,
        },
      })
    )
  })

  it('is a no-op for an organization that never had a workspace', async () => {
    mocks.findUnique.mockResolvedValue(null)

    const result = await archiveTenantRowForOrganization({
      organizationId: 'org_none',
      deletedBy: null,
      reason: null,
      now: NOW,
    })

    expect(result).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('queries by organizationId', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await archiveTenantRowForOrganization({
      organizationId: 'org_query',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'org_query' },
      select: { id: true, deletedAt: true },
    })
  })

  it('handles null deletedBy and null reason', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedBy: null,
          deletionReason: null,
        }),
      })
    )
  })

  it('sets updatedAt to the provided now timestamp', async () => {
    const customNow = 1_800_000_000
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: 'u1',
      reason: 'r',
      now: customNow,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updatedAt: customNow }),
      })
    )
  })

  it('always sets status to SUSPENDED', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUSPENDED' }),
      })
    )
  })

  it('uses tenant id in where clause', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'ten_custom_123',
      deletedAt: null,
    })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ten_custom_123' } })
    )
  })

  it('preserves first deletedAt when archiving an already-tombstoned workspace', async () => {
    const first = 1_000_000
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: first })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: 'new_user',
      reason: 'new reason',
      now: 2_000_000,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: first }),
      })
    )
  })

  it('does not overwrite deletedBy when already tombstoned', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 1_000 })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: 'should_not_save',
      reason: 'should_not_save',
      now: NOW,
    })
    const data = mocks.update.mock.calls[0]![0].data as Record<string, unknown>
    expect(data.deletedBy).toBeUndefined()
    expect(data.deletionReason).toBeUndefined()
  })

  it('returns the prisma update result', async () => {
    const updated = { id: 'ten_1', status: 'SUSPENDED', deletedAt: NOW }
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    mocks.update.mockResolvedValue(updated)
    const result = await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(result).toEqual(updated)
  })

  it('does not call findUniqueOrThrow', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled()
  })

  it('selects only id status deletedAt in update', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: null,
      reason: null,
      now: NOW,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, status: true, deletedAt: true },
      })
    )
  })

  it('handles empty string deletedBy and reason', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    await archiveTenantRowForOrganization({
      organizationId: 'org_1',
      deletedBy: '',
      reason: '',
      now: NOW,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedBy: '', deletionReason: '' }),
      })
    )
  })
})

describe('restoreTenantRowForOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({
      id: 'ten_1',
      status: 'ACTIVE',
      deletedAt: null,
    })
  })

  it('reopens a workspace the delete path tombstoned', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 1_000 })

    const result = await restoreTenantRowForOrganization({
      organizationId: 'org_1',
      now: NOW,
    })

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'ten_1' },
      data: {
        status: 'ACTIVE',
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: NOW,
      },
      select: { id: true, status: true, deletedAt: true },
    })
    expect(result).toEqual({ id: 'ten_1', status: 'ACTIVE', deletedAt: null })
  })

  it('leaves a workspace suspended for another reason shut', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: null,
    })

    const result = await restoreTenantRowForOrganization({
      organizationId: 'org_1',
      now: NOW,
    })

    expect(mocks.update).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: null,
    })
  })

  it('is a no-op for an organization that never had a workspace', async () => {
    mocks.findUnique.mockResolvedValue(null)

    const result = await restoreTenantRowForOrganization({
      organizationId: 'org_none',
      now: NOW,
    })

    expect(result).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled()
  })

  it('queries by organizationId', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await restoreTenantRowForOrganization({
      organizationId: 'org_xyz',
      now: NOW,
    })
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'org_xyz' },
      select: { id: true, deletedAt: true },
    })
  })

  it('calls findUniqueOrThrow when deletedAt is null', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: null,
    })
    await restoreTenantRowForOrganization({ organizationId: 'org_1', now: NOW })
    expect(mocks.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'ten_1' },
      select: { id: true, status: true, deletedAt: true },
    })
  })

  it('does not call findUniqueOrThrow when tombstoned', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 1_000 })
    await restoreTenantRowForOrganization({ organizationId: 'org_1', now: NOW })
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled()
  })

  it('clears tombstone fields on restore', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 999 })
    await restoreTenantRowForOrganization({ organizationId: 'org_1', now: NOW })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        }),
      })
    )
  })

  it('sets status to ACTIVE on restore', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 123 })
    await restoreTenantRowForOrganization({ organizationId: 'org_1', now: NOW })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('sets updatedAt to now on restore', async () => {
    const customNow = 1_900_000_000
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 100 })
    await restoreTenantRowForOrganization({
      organizationId: 'org_1',
      now: customNow,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updatedAt: customNow }),
      })
    )
  })

  it('returns update result on tombstoned restore', async () => {
    const updated = { id: 'ten_1', status: 'ACTIVE', deletedAt: null }
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: 555 })
    mocks.update.mockResolvedValue(updated)
    const result = await restoreTenantRowForOrganization({
      organizationId: 'org_1',
      now: NOW,
    })
    expect(result).toEqual(updated)
  })

  it('returns findUniqueOrThrow result when not tombstoned', async () => {
    const existing = { id: 'ten_1', status: 'SUSPENDED', deletedAt: null }
    mocks.findUnique.mockResolvedValue({ id: 'ten_1', deletedAt: null })
    mocks.findUniqueOrThrow.mockResolvedValue(existing)
    const result = await restoreTenantRowForOrganization({
      organizationId: 'org_1',
      now: NOW,
    })
    expect(result).toEqual(existing)
  })

  it('does not update when org never had workspace', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await restoreTenantRowForOrganization({
      organizationId: 'org_none',
      now: NOW,
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled()
  })

  it('uses tenant id in where clause for restore', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'ten_restore_me', deletedAt: 100 })
    await restoreTenantRowForOrganization({ organizationId: 'org_1', now: NOW })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ten_restore_me' } })
    )
  })
})
