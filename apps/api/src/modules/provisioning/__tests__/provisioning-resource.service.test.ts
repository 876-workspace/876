import { beforeEach, describe, expect, it, vi } from 'vitest'

const provisioning = vi.hoisted(() => ({
  retrieveCatalog: vi.fn(),
  retrieveManifest: vi.fn(),
  replaceDraft: vi.fn(),
}))

vi.mock('../provisioning.service', () => provisioning)

const service = await import('../provisioning-resource.service')

function property(
  key: string,
  valueType: 'string' | 'integer' | 'decimal' | 'boolean' | 'reference',
  value: string | number | boolean,
  referenceNamespace?: string
) {
  return {
    object: 'provisioning_property' as const,
    id: `prp_${key}`,
    key,
    value_type: valueType,
    string_value: valueType === 'string' ? String(value) : null,
    integer_value: valueType === 'integer' ? String(value) : null,
    decimal_value: valueType === 'decimal' ? String(value) : null,
    boolean_value: valueType === 'boolean' ? Boolean(value) : null,
    reference_namespace:
      valueType === 'reference' ? (referenceNamespace ?? null) : null,
    reference_key: valueType === 'reference' ? String(value) : null,
  }
}

function resource(
  resourceType: string,
  key: string,
  position: number,
  properties: ReturnType<typeof property>[]
) {
  return {
    object: 'provisioning_resource' as const,
    id: `prr_${resourceType}_${key}`,
    resource_type: resourceType,
    key,
    position,
    properties,
  }
}

function revision(resources: ReturnType<typeof resource>[]) {
  return {
    object: 'provisioning_manifest_revision' as const,
    id: 'pmr_01',
    manifest_id: 'pvm_01',
    manifest_version: 1 as const,
    revision: 3,
    status: 'draft' as const,
    reconciliation: 'create_missing' as const,
    preserve_tenant_overrides: true,
    finance_dependency: 'none' as const,
    finance_scopes: [],
    resources,
    steps: [],
    published_at: null,
    created_at: 1,
    updated_at: 1,
  }
}

function manifest(resources: ReturnType<typeof resource>[]) {
  return {
    object: 'provisioning_manifest' as const,
    id: 'pvm_01',
    target_type: 'finance' as const,
    target_key: 'jamaica',
    manifest_version: 1 as const,
    published: null,
    draft: revision(resources),
    created_at: 1,
    updated_at: 1,
  }
}

const DEFINITIONS = [
  {
    resource_type: 'currency',
    label: 'Currencies',
    description: '',
    multiple: true,
    minimum_items: 1,
    maximum_items: null,
    fields: [],
  },
  {
    resource_type: 'payment_mode',
    label: 'Payment modes',
    description: '',
    multiple: true,
    minimum_items: 1,
    maximum_items: null,
    fields: [],
  },
  {
    resource_type: 'invoice_preference',
    label: 'Invoice preferences',
    description: '',
    multiple: false,
    minimum_items: 1,
    maximum_items: 1,
    fields: [],
  },
  {
    resource_type: 'tax_rate',
    label: 'Tax rates',
    description: '',
    multiple: true,
    minimum_items: 0,
    maximum_items: null,
    fields: [],
  },
]

const BASE_RESOURCES = [
  resource('currency', 'JMD', 10, [property('code', 'string', 'JMD')]),
  resource('payment_mode', 'cash', 20, [property('name', 'string', 'Cash')]),
  resource('invoice_preference', 'default', 30, [
    property('defaultTaxBehavior', 'string', 'EXCLUSIVE'),
  ]),
]

beforeEach(() => {
  vi.clearAllMocks()
  provisioning.retrieveCatalog.mockResolvedValue({
    object: 'provisioning_catalog',
    manifest_version: 1,
    target_type: 'finance',
    resource_types: DEFINITIONS,
  })
  provisioning.retrieveManifest.mockResolvedValue(manifest(BASE_RESOURCES))
  provisioning.replaceDraft.mockImplementation(
    async (_type: string, _key: string, draft: { resources: unknown[] }) =>
      revision(draft.resources as ReturnType<typeof resource>[])
  )
})

describe('provisioning setup resource CRUD', () => {
  it('lists only the requested resource type from the working draft', async () => {
    const result = await service.listSetupResources('jamaica', 'currency')

    expect(result.data.map((item) => item.key)).toEqual(['JMD'])
    expect(result.total_count).toBe(1)
  })

  it('creates a resource without replacing unrelated resource families', async () => {
    const created = await service.createSetupResource('jamaica', 'currency', {
      key: 'USD',
      properties: [
        {
          key: 'code',
          value_type: 'string',
          string_value: 'USD',
        },
      ],
    })

    expect(created.key).toBe('USD')
    expect(provisioning.replaceDraft).toHaveBeenCalledWith(
      'finance',
      'jamaica',
      expect.objectContaining({
        resources: expect.arrayContaining([
          expect.objectContaining({ resource_type: 'currency', key: 'JMD' }),
          expect.objectContaining({ resource_type: 'currency', key: 'USD' }),
          expect.objectContaining({ resource_type: 'payment_mode', key: 'cash' }),
        ]),
      })
    )
  })

  it('rejects duplicate keys within a resource type', async () => {
    await expect(
      service.createSetupResource('jamaica', 'currency', {
        key: 'JMD',
        properties: [],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/resource-key-taken',
      httpStatus: 409,
    })
  })

  it('updates one resource while preserving its stable key', async () => {
    const updated = await service.updateSetupResource(
      'jamaica',
      'payment_mode',
      'cash',
      {
        properties: [
          {
            key: 'name',
            value_type: 'string',
            string_value: 'Cash / POS',
          },
        ],
      }
    )

    expect(updated.key).toBe('cash')
    expect(updated.properties[0]?.string_value).toBe('Cash / POS')
    expect(provisioning.replaceDraft).toHaveBeenCalledTimes(1)
  })

  it('does not allow deleting the final required row', async () => {
    await expect(
      service.deleteSetupResource('jamaica', 'payment_mode', 'cash')
    ).rejects.toMatchObject({
      code: 'provisioning/resource-minimum',
      httpStatus: 409,
    })
    expect(provisioning.replaceDraft).not.toHaveBeenCalled()
  })

  it('does not delete a resource referenced by another resource', async () => {
    const resources = [
      ...BASE_RESOURCES,
      resource('currency', 'USD', 40, [property('code', 'string', 'USD')]),
      resource('tax_rate', 'standard', 50, [
        property('currency', 'reference', 'USD', 'currency'),
      ]),
    ]
    provisioning.retrieveManifest.mockResolvedValue(manifest(resources))

    await expect(
      service.deleteSetupResource('jamaica', 'currency', 'USD')
    ).rejects.toMatchObject({
      code: 'provisioning/resource-in-use',
      httpStatus: 409,
    })
  })

  it('deletes optional resources and keeps the remaining draft intact', async () => {
    const resources = [
      ...BASE_RESOURCES,
      resource('tax_rate', 'standard', 40, [
        property('rate', 'decimal', '15.0'),
      ]),
    ]
    provisioning.retrieveManifest.mockResolvedValue(manifest(resources))

    const result = await service.deleteSetupResource(
      'jamaica',
      'tax_rate',
      'standard'
    )

    expect(result).toEqual({
      object: 'provisioning_resource',
      resource_type: 'tax_rate',
      key: 'standard',
      deleted: true,
    })
    expect(provisioning.replaceDraft).toHaveBeenCalledWith(
      'finance',
      'jamaica',
      expect.objectContaining({
        resources: expect.not.arrayContaining([
          expect.objectContaining({ resource_type: 'tax_rate', key: 'standard' }),
        ]),
      })
    )
  })
})
