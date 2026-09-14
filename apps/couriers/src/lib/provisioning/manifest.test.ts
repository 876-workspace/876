import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPlatformClient: vi.fn(),
  retrievePublished: vi.fn(),
}))

vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { loadCouriersProvisioningManifest } from './manifest'

function stringProperty(key: string, value: string) {
  return {
    object: 'provisioning_property' as const,
    id: `prop_${key}`,
    key,
    value_type: 'string' as const,
    string_value: value,
    integer_value: null,
    decimal_value: null,
    boolean_value: null,
    reference_namespace: null,
    reference_key: null,
  }
}

function integerProperty(key: string, value: string) {
  return {
    object: 'provisioning_property' as const,
    id: `prop_${key}`,
    key,
    value_type: 'integer' as const,
    string_value: null,
    integer_value: value,
    decimal_value: null,
    boolean_value: null,
    reference_namespace: null,
    reference_key: null,
  }
}

function booleanProperty(key: string, value: boolean) {
  return {
    object: 'provisioning_property' as const,
    id: `prop_${key}`,
    key,
    value_type: 'boolean' as const,
    string_value: null,
    integer_value: null,
    decimal_value: null,
    boolean_value: value,
    reference_namespace: null,
    reference_key: null,
  }
}

describe('loadCouriersProvisioningManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPlatformClient.mockResolvedValue({
      provisioning: { retrievePublished: mocks.retrievePublished },
    })
    mocks.retrievePublished.mockResolvedValue({
      data: {
        revision: 7,
        resources: [
          {
            resource_type: 'package_category',
            key: 'electronics',
            properties: [
              stringProperty('name', 'Electronics'),
              stringProperty(
                'description',
                'Consumer electronics and accessories.'
              ),
              integerProperty('sortOrder', '40'),
              booleanProperty('isActive', true),
            ],
          },
          {
            resource_type: 'app-role',
            key: '876-couriers:staff',
            properties: [],
          },
        ],
      },
      error: null,
    })
  })

  it('loads only package category resources from the published app manifest', async () => {
    const manifest = await loadCouriersProvisioningManifest()

    expect(mocks.retrievePublished).toHaveBeenCalledWith(
      'application',
      '876-couriers'
    )
    expect(manifest).toEqual({
      object: 'couriers_provisioning_manifest',
      revision: 7,
      packageCategories: [
        {
          key: 'electronics',
          name: 'Electronics',
          description: 'Consumer electronics and accessories.',
          icon: null,
          sortOrder: 40,
          isActive: true,
        },
      ],
    })
  })

  it('rejects a published manifest without package categories', async () => {
    mocks.retrievePublished.mockResolvedValue({
      data: { revision: 8, resources: [] },
      error: null,
    })

    await expect(loadCouriersProvisioningManifest()).rejects.toThrow(
      'Couriers provisioning requires at least one package category.'
    )
  })

  it('rejects a missing published manifest', async () => {
    mocks.retrievePublished.mockResolvedValue({
      data: null,
      error: { code: 'provisioning/manifest-not-found', message: 'Missing.' },
    })

    await expect(loadCouriersProvisioningManifest()).rejects.toThrow('Missing.')
  })

  it('rejects malformed category properties instead of guessing defaults', async () => {
    mocks.retrievePublished.mockResolvedValue({
      data: {
        revision: 9,
        resources: [
          {
            resource_type: 'package_category',
            key: 'electronics',
            properties: [
              stringProperty('name', 'Electronics'),
              stringProperty('sortOrder', 'forty'),
              booleanProperty('isActive', true),
            ],
          },
        ],
      },
      error: null,
    })

    await expect(loadCouriersProvisioningManifest()).rejects.toThrow(
      'Couriers provisioning property sortOrder must be an integer.'
    )
  })
})
