import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  loadBillingApplicationProvisioningManifest,
  loadBillingProvisioningManifest,
} from './manifest'

const mocks = vi.hoisted(() => ({ retrievePublished: vi.fn() }))

vi.mock('@/lib/876/platform-client', () => ({
  createBackgroundPlatformClient: () => ({
    provisioning: { retrievePublished: mocks.retrievePublished },
  }),
}))

const property = (
  key: string,
  value_type: 'string' | 'integer' | 'decimal' | 'boolean' | 'reference',
  value: string | number | boolean
) => ({
  object: 'provisioning_property' as const,
  id: `prop_${key}`,
  key,
  value_type,
  string_value: value_type === 'string' ? String(value) : null,
  integer_value: value_type === 'integer' ? String(value) : null,
  decimal_value: value_type === 'decimal' ? String(value) : null,
  boolean_value: value_type === 'boolean' ? Boolean(value) : null,
  reference_namespace: value_type === 'reference' ? key : null,
  reference_key: value_type === 'reference' ? String(value) : null,
})

const resource = (
  resource_type: string,
  properties: ReturnType<typeof property>[],
  key = 'default'
) => ({
  object: 'provisioning_resource' as const,
  id: `resource_${resource_type}`,
  resource_type,
  key,
  position: 0,
  properties,
})

function profile() {
  return {
    object: 'provisioning_manifest_revision' as const,
    id: 'pmr_billing_3',
    manifest_id: 'pm_finance_shared',
    manifest_version: 1 as const,
    revision: 3,
    status: 'published' as const,
    reconciliation: 'create_missing' as const,
    preserve_tenant_overrides: true,
    finance_dependency: 'none' as const,
    finance_scopes: [],
    resources: [
      resource('workspace', [
        property('countryCode', 'reference', 'JM'),
        property('baseCurrency', 'reference', 'JMD'),
        property('defaultCurrency', 'reference', 'JMD'),
        property('defaultLanguage', 'reference', 'en'),
      ]),
      resource('invoice_preference', [
        property('defaultTaxBehavior', 'string', 'EXCLUSIVE'),
        property('lateFeesEnabled', 'boolean', false),
        property('lateFeeCalculationType', 'string', 'PERCENTAGE'),
        property('lateFeePercent', 'decimal', 0),
        property('lateFeeGraceDays', 'integer', 0),
        property('lateFeeGenerateAsDraft', 'boolean', true),
      ]),
      resource('currency', [property('code', 'string', 'JMD')], 'JMD'),
      resource(
        'tax_authority',
        [
          property('name', 'string', 'Tax Administration Jamaica'),
          property('description', 'string', 'National revenue administration'),
          property('countryCode', 'reference', 'JM'),
        ],
        'taj'
      ),
      resource(
        'tax_rate',
        [
          property('name', 'string', 'Standard GCT'),
          property('description', 'string', 'Standard rate'),
          property('taxType', 'string', 'gct'),
          property('rate', 'decimal', 15),
          property('inclusive', 'boolean', false),
          property('authority', 'reference', 'taj'),
        ],
        'gct-standard'
      ),
      resource('payment_mode', [property('name', 'string', 'Bank transfer')]),
      resource('payment_term', [
        property('name', 'string', 'Due on receipt'),
        property('rule', 'string', 'DUE_ON_RECEIPT'),
        property('dueDays', 'integer', 0),
      ]),
    ],
    steps: [],
    published_at: 1,
    created_at: 1,
    updated_at: 1,
  }
}

describe('loadBillingProvisioningManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrievePublished.mockResolvedValue({
      data: profile(),
      error: null,
    })
  })

  it('resolves typed values and opaque references from the control plane', async () => {
    const manifest = await loadBillingProvisioningManifest()

    expect(manifest.manifestVersion).toBe(1)
    expect(manifest.revision).toBe(3)
    expect(manifest.defaults.baseCurrency).toBe('JMD')
    expect(manifest.defaults.invoicePreferences).toMatchObject({
      defaultTaxBehavior: 'EXCLUSIVE',
      lateFeesEnabled: false,
      lateFeePercent: 0,
    })
    expect(manifest.defaults.currencies).toEqual(['JMD'])
    expect(manifest.defaults.taxAuthorities[0]?.key).toBe('taj')
    expect(manifest.defaults.taxRates[0]).toMatchObject({
      authorityKey: 'taj',
      rate: '15',
    })
  })

  it('fails closed when the profile is unavailable', async () => {
    mocks.retrievePublished.mockResolvedValue({
      data: null,
      error: {
        code: 'provisioning/published-revision-not-found',
        message: 'Missing.',
      },
    })

    await expect(loadBillingProvisioningManifest()).rejects.toThrow('Missing.')
  })
})

describe('loadBillingApplicationProvisioningManifest', () => {
  it('maps document-specific notes and terms from manifest v1', async () => {
    mocks.retrievePublished.mockResolvedValue({
      data: {
        ...profile(),
        revision: 4,
        resources: [
          resource(
            'document_preference',
            [
              property('documentType', 'string', 'credit_note'),
              property(
                'customerNote',
                'string',
                'Thank you for your business.'
              ),
              property(
                'termsAndConditions',
                'string',
                'Credit remains on account.'
              ),
            ],
            'credit-note-defaults'
          ),
        ],
      },
      error: null,
    })

    const manifest = await loadBillingApplicationProvisioningManifest()

    expect(mocks.retrievePublished).toHaveBeenCalledWith(
      'application',
      '876-billing'
    )
    expect(manifest).toMatchObject({
      manifestVersion: 1,
      revision: 4,
      documentPreferences: [
        {
          documentType: 'CREDIT_NOTE',
          customerNote: 'Thank you for your business.',
          termsAndConditions: 'Credit remains on account.',
        },
      ],
    })
  })
})
