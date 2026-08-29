import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    requestForm: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../../../db/index.js', () => ({ prisma: mockPrisma }))

const repository = await import('../request-forms.repository.js')

const input = {
  provisioningKey: '876-support',
  name: '876 Support',
  slug: '876-support',
  description: null,
  placement: 'EMBEDDED' as const,
  definition: { fields: [] },
  defaultCategoryId: 'crm_cat_1',
  defaultSubcategoryId: null,
  defaultTeamId: null,
  defaultPriorityId: 'crm_pri_1',
  confirmationTitle: 'Request received',
  confirmationMessage: null,
}

function uniqueViolation() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('request-forms.repository - ensureProvisioned', () => {
  it('returns the live provisioned form without writing anything', async () => {
    const existing = { id: 'crm_form_1', deletedAt: null, version: 3 }
    mockPrisma.requestForm.findFirst.mockResolvedValue(existing)

    const result = await repository.ensureProvisioned('crm_tnt_1', input)

    expect(result).toBe(existing)
    expect(mockPrisma.requestForm.create).not.toHaveBeenCalled()
    expect(mockPrisma.requestForm.update).not.toHaveBeenCalled()
  })

  it('creates the form under its tenant-scoped provisioning key', async () => {
    mockPrisma.requestForm.findFirst.mockResolvedValue(null)
    mockPrisma.requestForm.create.mockResolvedValue({ id: 'crm_form_new' })

    const result = await repository.ensureProvisioned('crm_tnt_1', input)

    expect(result).toEqual({ id: 'crm_form_new' })
    expect(mockPrisma.requestForm.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.requestForm.create.mock.calls[0]?.[0].data).toMatchObject(
      {
        tenantId: 'crm_tnt_1',
        provisioningKey: '876-support',
        status: 'PUBLISHED',
        placement: 'EMBEDDED',
        version: 1,
        createdBy: 'system',
      }
    )
  })

  it('revives a soft-deleted provisioned form in place', async () => {
    mockPrisma.requestForm.findFirst.mockResolvedValue({
      id: 'crm_form_1',
      deletedAt: new Date('2026-08-01T00:00:00.000Z'),
      publishedAt: null,
      version: 2,
    })
    mockPrisma.requestForm.update.mockResolvedValue({ id: 'crm_form_1' })

    const result = await repository.ensureProvisioned('crm_tnt_1', input)

    expect(result).toEqual({ id: 'crm_form_1' })
    expect(mockPrisma.requestForm.create).not.toHaveBeenCalled()
    expect(mockPrisma.requestForm.update.mock.calls[0]?.[0].data).toMatchObject(
      {
        status: 'PUBLISHED',
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      }
    )
  })

  it('re-reads the winner when a concurrent ensure created it first', async () => {
    const winner = { id: 'crm_form_winner', deletedAt: null }
    mockPrisma.requestForm.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner)
    mockPrisma.requestForm.create.mockRejectedValue(uniqueViolation())

    const result = await repository.ensureProvisioned('crm_tnt_1', input)

    expect(result).toBe(winner)
    expect(mockPrisma.requestForm.findFirst).toHaveBeenCalledTimes(2)
  })

  it('rethrows a unique violation that is not the provisioning key', async () => {
    mockPrisma.requestForm.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockPrisma.requestForm.create.mockRejectedValue(uniqueViolation())

    await expect(
      repository.ensureProvisioned('crm_tnt_1', input)
    ).rejects.toThrow('Unique constraint failed')
  })

  it('does not treat an unrelated database failure as a race', async () => {
    mockPrisma.requestForm.findFirst.mockResolvedValue(null)
    mockPrisma.requestForm.create.mockRejectedValue(new Error('db down'))

    await expect(
      repository.ensureProvisioned('crm_tnt_1', input)
    ).rejects.toThrow('db down')
    expect(mockPrisma.requestForm.findFirst).toHaveBeenCalledTimes(1)
  })
})

describe('request-forms.repository - retrieveByProvisioningKey', () => {
  it('scopes the lookup to the tenant and the key', async () => {
    mockPrisma.requestForm.findFirst.mockResolvedValue(null)

    await repository.retrieveByProvisioningKey('crm_tnt_1', '876-support')

    expect(mockPrisma.requestForm.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'crm_tnt_1', provisioningKey: '876-support' },
    })
  })
})
