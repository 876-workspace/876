import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

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
      }) as unknown as ReturnType<typeof priorities.ensureProvisioned>
  )
  categories.ensureProvisionedCategory.mockImplementation(
    async (_tid: string, input: { provisioningKey: string }) =>
      ({ id: `crm_cat_${input.provisioningKey}` }) as unknown as ReturnType<
        typeof categories.ensureProvisionedCategory
      >
  )
  categories.ensureProvisionedSubcategory.mockResolvedValue({
    id: 'crm_sub_invoice',
  } as unknown as ReturnType<typeof categories.ensureProvisionedSubcategory>)
})

describe('reconcileCrmProvisioning - values not throws', () => {
  it('returns error value not throw when category references missing priority', async () => {
    const result = await reconcileCrmProvisioning(
      't1',
      manifest({
        categories: [
          {
            key: 'billing',
            name: 'Billing',
            description: null,
            color: null,
            icon: null,
            sortOrder: 10,
            isActive: true,
            defaultPriorityKey: 'missing',
          },
        ],
      }) as never
    )
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({
      code: 'crm/provisioning-invalid',
      httpStatus: 500,
    })
  })

  it('returns error value when subcategory references missing category', async () => {
    const result = await reconcileCrmProvisioning(
      't1',
      manifest({
        subcategories: [
          {
            key: 'invoice',
            categoryKey: 'nope',
            name: 'Invoice',
            description: null,
            icon: null,
            sortOrder: 10,
            isActive: true,
            defaultPriorityKey: null,
          },
        ],
      }) as never
    )
    expect(isError(result)).toBe(true)
    expect((result as { code: string }).code).toBe('crm/provisioning-invalid')
  })

  it('returns error value when subcategory references missing priority', async () => {
    const result = await reconcileCrmProvisioning(
      't1',
      manifest({
        subcategories: [
          {
            key: 'invoice',
            categoryKey: 'billing',
            name: 'Invoice',
            description: null,
            icon: null,
            sortOrder: 10,
            isActive: true,
            defaultPriorityKey: 'missing',
          },
        ],
      }) as never
    )
    expect(isError(result)).toBe(true)
  })

  it('succeeds with valid manifest returning null', async () => {
    const result = await reconcileCrmProvisioning('t1', manifest() as never)
    expect(result).toBeNull()
  })

  it('handles empty priorities/categories/subcategories gracefully', async () => {
    const result = await reconcileCrmProvisioning(
      't1',
      manifest({ priorities: [], categories: [], subcategories: [] }) as never
    )
    expect(result).toBeNull()
    expect(priorities.ensureProvisioned).not.toHaveBeenCalled()
  })

  it('does not throw when ensureProvisioned rejects; lets exception bubble (unexpected)', async () => {
    priorities.ensureProvisioned.mockRejectedValueOnce(new Error('db down'))
    await expect(
      reconcileCrmProvisioning('t1', manifest() as never)
    ).rejects.toThrow('db down')
  })

  it('maps null defaultPriorityKey to null id', async () => {
    await reconcileCrmProvisioning(
      't1',
      manifest({
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
      }) as never
    )
    expect(categories.ensureProvisionedCategory).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ defaultPriorityId: null })
    )
  })

  it('returns null when all subcategories succeed', async () => {
    const m = manifest({
      subcategories: [
        {
          key: 'a',
          categoryKey: 'billing',
          name: 'A',
          description: null,
          icon: null,
          sortOrder: 1,
          isActive: true,
          defaultPriorityKey: null,
        },
        {
          key: 'b',
          categoryKey: 'billing',
          name: 'B',
          description: null,
          icon: null,
          sortOrder: 2,
          isActive: true,
          defaultPriorityKey: 'low',
        },
      ],
    }) as never
    const result = await reconcileCrmProvisioning('t1', m)
    expect(result).toBeNull()
    expect(categories.ensureProvisionedSubcategory).toHaveBeenCalledTimes(2)
  })

  it('error value is plain not Error instance', async () => {
    const result = await reconcileCrmProvisioning(
      't1',
      manifest({
        categories: [
          {
            key: 'billing',
            name: 'Billing',
            description: null,
            color: null,
            icon: null,
            sortOrder: 10,
            isActive: true,
            defaultPriorityKey: 'missing',
          },
        ],
      }) as never
    )
    expect(result).not.toBeInstanceOf(Error)
    expect(isError(result)).toBe(true)
  })
})
