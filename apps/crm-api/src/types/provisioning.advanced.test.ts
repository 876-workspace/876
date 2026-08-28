import { describe, expect, it } from 'vitest'

import { crmProvisioningManifestSchema } from './provisioning.js'

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
      {
        key: 'high',
        name: 'High',
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
        defaultPriorityKey: null,
      },
    ],
    ...overrides,
  }
}

describe('crmProvisioningManifestSchema - valid', () => {
  it('parses a valid manifest', () => {
    expect(crmProvisioningManifestSchema.parse(manifest())).toMatchObject({
      object: 'crm_provisioning_manifest',
      revision: 1,
    })
  })

  it('trims keys and names', () => {
    const parsed = crmProvisioningManifestSchema.parse(
      manifest({
        priorities: [
          {
            key: ' low ',
            name: ' Low ',
            description: null,
            color: null,
            icon: null,
            weight: 10,
            sortOrder: 10,
            isDefault: true,
          },
        ],
        categories: [
          {
            key: ' cat ',
            name: ' Cat ',
            description: null,
            color: null,
            icon: null,
            sortOrder: 0,
            isActive: true,
            defaultPriorityKey: 'low',
          },
        ],
        subcategories: [],
      })
    ) as unknown as Record<string, unknown>
    // schema trims? Actually keys are trimmed via z.string().trim()
    expect(
      (parsed as unknown as { priorities: Array<{ key: string }> })
        .priorities[0].key
    ).toBe('low')
  })
})

describe('crmProvisioningManifestSchema - revision and shape', () => {
  it('rejects missing revision or non-positive', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ revision: 0 }))
    ).toThrow()
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ revision: -1 }))
    ).toThrow()
    expect(() =>
      crmProvisioningManifestSchema.parse({
        ...manifest(),
        revision: undefined,
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })

  it('rejects unknown object literal', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ object: 'wrong' }))
    ).toThrow()
  })

  it('requires at least one priority and one category', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ priorities: [] }))
    ).toThrow()
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ categories: [] }))
    ).toThrow()
  })

  it('rejects extra top-level fields (strictObject)', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse({
        ...manifest(),
        extra: 1,
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})

describe('crmProvisioningManifestSchema - priority uniqueness and default', () => {
  it('rejects duplicate priority keys', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'dup',
              name: 'A',
              description: null,
              color: null,
              icon: null,
              weight: 10,
              sortOrder: 10,
              isDefault: true,
            },
            {
              key: 'dup',
              name: 'B',
              description: null,
              color: null,
              icon: null,
              weight: 20,
              sortOrder: 20,
              isDefault: false,
            },
          ],
        })
      )
    ).toThrow(/Priority keys must be unique/)
  })

  it('rejects zero or multiple defaults', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'a',
              name: 'A',
              description: null,
              color: null,
              icon: null,
              weight: 10,
              sortOrder: 10,
              isDefault: false,
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
          ],
        })
      )
    ).toThrow(/Exactly one.*default/)
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
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
              isDefault: true,
            },
          ],
        })
      )
    ).toThrow(/Exactly one.*default/)
  })

  it('rejects duplicate category keys', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          categories: [
            {
              key: 'dup',
              name: 'A',
              description: null,
              color: null,
              icon: null,
              sortOrder: 10,
              isActive: true,
              defaultPriorityKey: null,
            },
            {
              key: 'dup',
              name: 'B',
              description: null,
              color: null,
              icon: null,
              sortOrder: 20,
              isActive: true,
              defaultPriorityKey: null,
            },
          ],
        })
      )
    ).toThrow(/Category keys must be unique/)
  })
})

describe('crmProvisioningManifestSchema - reference integrity', () => {
  it('rejects category referencing unknown priority', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
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
              defaultPriorityKey: 'ghost',
            },
          ],
        })
      )
    ).toThrow(/references an unknown priority/)
  })

  it('accepts category with null defaultPriorityKey', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
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
        })
      )
    ).not.toThrow()
  })

  it('rejects subcategory referencing unknown category', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
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
      )
    ).toThrow(/references an unknown category/)
  })

  it('rejects subcategory referencing unknown priority', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
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
              defaultPriorityKey: 'ghost',
            },
          ],
        })
      )
    ).toThrow(/references an unknown priority/)
  })

  it('accepts subcategory with null defaultPriorityKey', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
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
              defaultPriorityKey: null,
            },
          ],
        })
      )
    ).not.toThrow()
  })
})

describe('crmProvisioningManifestSchema - field limits', () => {
  it('enforces priority key max 100 and name max 120', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'a'.repeat(101),
              name: 'Low',
              description: null,
              color: null,
              icon: null,
              weight: 10,
              sortOrder: 10,
              isDefault: true,
            },
          ],
        })
      )
    ).toThrow()
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'low',
              name: 'a'.repeat(121),
              description: null,
              color: null,
              icon: null,
              weight: 10,
              sortOrder: 10,
              isDefault: true,
            },
          ],
        })
      )
    ).toThrow()
  })

  it('enforces weight and sortOrder 0..1_000_000', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'low',
              name: 'Low',
              description: null,
              color: null,
              icon: null,
              weight: -1,
              sortOrder: 10,
              isDefault: true,
            },
          ],
        })
      )
    ).toThrow()
    expect(() =>
      crmProvisioningManifestSchema.parse(
        manifest({
          priorities: [
            {
              key: 'low',
              name: 'Low',
              description: null,
              color: null,
              icon: null,
              weight: 1_000_001,
              sortOrder: 10,
              isDefault: true,
            },
          ],
        })
      )
    ).toThrow()
  })

  it('allows empty subcategories', () => {
    expect(() =>
      crmProvisioningManifestSchema.parse(manifest({ subcategories: [] }))
    ).not.toThrow()
  })
})
