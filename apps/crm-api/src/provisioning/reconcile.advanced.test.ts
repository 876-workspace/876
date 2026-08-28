import { beforeEach, describe, expect, it, vi } from 'vitest'

const { priorities, categories } = vi.hoisted(() => ({
  priorities: { ensureProvisioned: vi.fn() },
  categories: {
    ensureProvisionedCategory: vi.fn(),
    ensureProvisionedSubcategory: vi.fn(),
  },
}))

vi.mock('../modules/priorities/index.js', () => priorities)
vi.mock('../modules/categories/index.js', () => categories)

const { reconcileCrmProvisioning } = await import('./reconcile.js')

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    object: 'crm_provisioning_manifest' as const,
    revision: 1,
    priorities: [
      {
        key: 'low',
        name: 'Low',
        description: null,
        color: null,
        icon: null,
        weight: 10,
        sortOrder: 10,
        isDefault: false,
      },
      {
        key: 'normal',
        name: 'Normal',
        description: null,
        color: null,
        icon: null,
        weight: 20,
        sortOrder: 20,
        isDefault: true,
      },
    ],
    categories: [
      {
        key: 'billing',
        name: 'Billing',
        description: null,
        color: null,
        icon: null,
        sortOrder: 10,
        isActive: true,
        defaultPriorityKey: 'normal',
      },
    ],
    subcategories: [
      {
        key: 'invoice',
        categoryKey: 'billing',
        name: 'Invoice',
        description: null,
        icon: null,
        sortOrder: 10,
        isActive: true,
        defaultPriorityKey: 'low',
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  priorities.ensureProvisioned.mockImplementation(
    async (_tid: string, input: { provisioningKey: string }) =>
      ({
        id: `crm_pri_${input.provisioningKey}`,
        provisioningKey: input.provisioningKey,
      }) as unknown as Awaited<ReturnType<typeof priorities.ensureProvisioned>>
  )
  categories.ensureProvisionedCategory.mockImplementation(
    async (_tid: string, input: { provisioningKey: string }) =>
      ({ id: `crm_cat_${input.provisioningKey}` }) as unknown as Awaited<
        ReturnType<typeof categories.ensureProvisionedCategory>
      >
  )
  categories.ensureProvisionedSubcategory.mockResolvedValue({
    id: 'crm_sub_invoice',
  } as unknown as Awaited<
    ReturnType<typeof categories.ensureProvisionedSubcategory>
  >)
})

describe('reconcileCrmProvisioning - happy path', () => {
  it('creates priorities then categories then subcategories in order', async () => {
    await reconcileCrmProvisioning(
      'crm_tnt_1',
      manifest() as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
    )
    expect(priorities.ensureProvisioned).toHaveBeenCalledTimes(2)
    expect(priorities.ensureProvisioned).toHaveBeenNthCalledWith(
      1,
      'crm_tnt_1',
      expect.objectContaining({ provisioningKey: 'low' })
    )
    expect(categories.ensureProvisionedCategory).toHaveBeenCalledWith(
      'crm_tnt_1',
      expect.objectContaining({
        provisioningKey: 'billing',
        defaultPriorityId: 'crm_pri_normal',
      })
    )
    expect(categories.ensureProvisionedSubcategory).toHaveBeenCalledWith(
      'crm_tnt_1',
      expect.objectContaining({
        provisioningKey: 'invoice',
        categoryId: 'crm_cat_billing',
        defaultPriorityId: 'crm_pri_low',
      })
    )
  })

  it('maps defaultPriorityKey to resolved priorityId', async () => {
    await reconcileCrmProvisioning(
      'crm_tnt_1',
      manifest() as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
    )
    const catCall = categories.ensureProvisionedCategory.mock
      .calls[0][1] as Record<string, unknown>
    expect(catCall.defaultPriorityId).toBe('crm_pri_normal')
    const subCall = categories.ensureProvisionedSubcategory.mock
      .calls[0][1] as Record<string, unknown>
    expect(subCall.defaultPriorityId).toBe('crm_pri_low')
  })

  it('handles null defaultPriorityKey as null', async () => {
    const m = manifest({
      categories: [
        {
          key: 'billing',
          name: 'Billing',
          description: null,
          color: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: null,
        },
      ],
      subcategories: [
        {
          key: 'invoice',
          categoryKey: 'billing',
          name: 'Invoice',
          description: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: null,
        },
      ],
    })
    await reconcileCrmProvisioning(
      'crm_tnt_1',
      m as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
    )
    expect(categories.ensureProvisionedCategory).toHaveBeenCalledWith(
      'crm_tnt_1',
      expect.objectContaining({ defaultPriorityId: null })
    )
    expect(categories.ensureProvisionedSubcategory).toHaveBeenCalledWith(
      'crm_tnt_1',
      expect.objectContaining({ defaultPriorityId: null })
    )
  })
})

describe('reconcileCrmProvisioning - reference errors', () => {
  it('throws provisioning-invalid when category references unknown priority', async () => {
    const m = manifest({
      categories: [
        {
          key: 'billing',
          name: 'Billing',
          description: null,
          color: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: 'ghost',
        },
      ],
    })
    await expect(
      reconcileCrmProvisioning(
        'crm_tnt_1',
        m as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
      )
    ).rejects.toMatchObject({ code: 'crm/provisioning-invalid' })
    expect(categories.ensureProvisionedCategory).not.toHaveBeenCalled()
  })

  it('throws when subcategory references unknown category', async () => {
    const m = manifest({
      subcategories: [
        {
          key: 'orphan',
          categoryKey: 'missing',
          name: 'Orphan',
          description: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: null,
        },
      ],
    })
    await expect(
      reconcileCrmProvisioning(
        'crm_tnt_1',
        m as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
      )
    ).rejects.toMatchObject({ code: 'crm/provisioning-invalid' })
    expect(categories.ensureProvisionedSubcategory).not.toHaveBeenCalled()
  })

  it('throws when subcategory references unknown priority', async () => {
    const m = manifest({
      subcategories: [
        {
          key: 'invoice',
          categoryKey: 'billing',
          name: 'Invoice',
          description: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: 'ghost',
        },
      ],
    })
    await expect(
      reconcileCrmProvisioning(
        'crm_tnt_1',
        m as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
      )
    ).rejects.toMatchObject({ code: 'crm/provisioning-invalid' })
  })
})

describe('reconcileCrmProvisioning - idempotency', () => {
  it('calls ensureProvisioned for each priority exactly once', async () => {
    const m = manifest({
      priorities: [
        {
          key: 'a',
          name: 'A',
          description: null,
          color: null,
          icon: null,
          weight: 10,
          sortOrder: 10,
          isDefault: true,
        },
        {
          key: 'b',
          name: 'B',
          description: null,
          color: null,
          icon: null,
          weight: 20,
          sortOrder: 20,
          isDefault: false,
        },
        {
          key: 'c',
          name: 'C',
          description: null,
          color: null,
          icon: null,
          weight: 30,
          sortOrder: 30,
          isDefault: false,
        },
      ],
      categories: [
        {
          key: 'billing',
          name: 'Billing',
          description: null,
          color: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: 'a',
        },
      ],
      subcategories: [
        {
          key: 'invoice',
          categoryKey: 'billing',
          name: 'Invoice',
          description: null,
          icon: null,
          sortOrder: 10,
          isActive: true,
          defaultPriorityKey: 'b',
        },
      ],
    })
    await reconcileCrmProvisioning(
      'crm_tnt_1',
      m as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
    )
    expect(priorities.ensureProvisioned).toHaveBeenCalledTimes(3)
  })

  it('propagates priority ensureProvisioned errors', async () => {
    priorities.ensureProvisioned.mockRejectedValue({
      code: 'crm/priority-not-found',
    })
    await expect(
      reconcileCrmProvisioning(
        'crm_tnt_1',
        manifest() as unknown as Parameters<typeof reconcileCrmProvisioning>[1]
      )
    ).rejects.toMatchObject({ code: 'crm/priority-not-found' })
  })
})
