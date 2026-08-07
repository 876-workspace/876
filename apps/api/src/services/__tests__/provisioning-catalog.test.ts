import { describe, expect, it } from 'vitest'

import {
  APPLICATION_RESOURCES,
  FINANCE_RESOURCES,
  ORGANIZATION_RESOURCES,
  catalogDefinitions,
  resourceRegistry,
  validateDraft,
} from '../provisioning-catalog'
import type {
  ProvisioningDraftReplace,
  ProvisioningPropertyInput,
} from '../provisioning-catalog'

function prop(
  key: string,
  valueType: ProvisioningPropertyInput['valueType'],
  overrides: Partial<ProvisioningPropertyInput> = {}
): ProvisioningPropertyInput {
  const base: ProvisioningPropertyInput = {
    key,
    valueType,
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }

  if (valueType === 'string') base.stringValue = 'x'
  if (valueType === 'integer') base.integerValue = 1
  if (valueType === 'decimal') base.decimalValue = '1.5'
  if (valueType === 'boolean') base.booleanValue = true
  if (valueType === 'reference') {
    base.referenceNamespace = 'currency'
    base.referenceKey = 'usd'
  }

  return { ...base, ...overrides }
}

function minimalFinanceDraft(
  overrides: Partial<ProvisioningDraftReplace> = {}
): ProvisioningDraftReplace {
  return {
    financeDependency: 'none',
    resources: [
      {
        resourceType: 'currency',
        key: 'usd',
        position: 0,
        properties: [
          { ...prop('code', 'string', { stringValue: 'USD' }) },
          { ...prop('name', 'string', { stringValue: 'US Dollar' }) },
          { ...prop('minorUnit', 'integer', { integerValue: 2 }) },
        ],
      },
      {
        resourceType: 'workspace',
        key: 'main',
        position: 1,
        properties: [
          prop('countryCode', 'reference', {
            referenceNamespace: 'country',
            referenceKey: 'US',
          }),
          prop('baseCurrency', 'reference', {
            referenceNamespace: 'currency',
            referenceKey: 'usd',
          }),
          prop('defaultCurrency', 'reference', {
            referenceNamespace: 'currency',
            referenceKey: 'usd',
          }),
          prop('defaultLanguage', 'reference', {
            referenceNamespace: 'language',
            referenceKey: 'en',
          }),
        ],
      },
      {
        resourceType: 'payment_mode',
        key: 'card',
        position: 2,
        properties: [prop('name', 'string', { stringValue: 'Card' })],
      },
      {
        resourceType: 'payment_term',
        key: 'net30',
        position: 3,
        properties: [
          prop('name', 'string', { stringValue: 'Net 30' }),
          prop('rule', 'string', { stringValue: 'NET_DAYS' }),
          prop('dueDays', 'integer', { integerValue: 30 }),
        ],
      },
      {
        resourceType: 'invoice_preference',
        key: 'prefs',
        position: 4,
        properties: [
          prop('defaultTaxBehavior', 'string', { stringValue: 'EXCLUSIVE' }),
          prop('lateFeesEnabled', 'boolean', { booleanValue: true }),
          prop('lateFeeCalculationType', 'string', {
            stringValue: 'PERCENTAGE',
          }),
          prop('lateFeeGraceDays', 'integer', { integerValue: 5 }),
          prop('lateFeeGenerateAsDraft', 'boolean', { booleanValue: false }),
        ],
      },
      {
        resourceType: 'tax_authority',
        key: 'irs',
        position: 5,
        properties: [
          prop('name', 'string', { stringValue: 'IRS' }),
          prop('countryCode', 'reference', {
            referenceNamespace: 'country',
            referenceKey: 'US',
          }),
        ],
      },
      {
        resourceType: 'tax_rate',
        key: 'vat',
        position: 6,
        properties: [
          prop('name', 'string', { stringValue: 'VAT' }),
          prop('rate', 'decimal', { decimalValue: '20.00' }),
          prop('inclusive', 'boolean', { booleanValue: false }),
          prop('authority', 'reference', {
            referenceNamespace: 'tax_authority',
            referenceKey: 'irs',
          }),
        ],
      },
    ],
    ...overrides,
  }
}

describe('resourceRegistry', () => {
  it('returns finance resources for finance target', () => {
    expect(resourceRegistry('finance', '')).toBe(FINANCE_RESOURCES)
  })

  it('returns organization resources for organization target', () => {
    expect(resourceRegistry('organization', '')).toBe(ORGANIZATION_RESOURCES)
  })

  it('returns billing resources for billing app', () => {
    expect(resourceRegistry('application', '876-billing')).toBe(
      APPLICATION_RESOURCES['876-billing']
    )
  })

  it('returns empty for unknown application key', () => {
    expect(resourceRegistry('application', 'unknown-app')).toEqual({})
  })
})

describe('catalogDefinitions', () => {
  it('returns full finance catalog with exact shapes', () => {
    const defs = catalogDefinitions('finance', '')

    // Full assertion — every resource, every field, no snapshot drift.
    expect(defs).toEqual([
      {
        resourceType: 'currency',
        label: 'Currencies',
        description: 'Currencies created for every new finance workspace.',
        multiple: true,
        minimumItems: 1,
        maximumItems: null,
        fields: [
          {
            key: 'code',
            label: 'ISO code',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'name',
            label: 'Name',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'numericCode',
            label: 'Numeric code',
            valueType: 'string',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'minorUnit',
            label: 'Minor unit',
            valueType: 'integer',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'symbol',
            label: 'Symbol',
            valueType: 'string',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'workspace',
        label: 'Workspace defaults',
        description: 'Locale and currency defaults for a finance workspace.',
        multiple: false,
        minimumItems: 1,
        maximumItems: 1,
        fields: [
          {
            key: 'countryCode',
            label: 'Country',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'country',
            allowedValues: null,
          },
          {
            key: 'baseCurrency',
            label: 'Base currency',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'currency',
            allowedValues: null,
          },
          {
            key: 'defaultCurrency',
            label: 'Default currency',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'currency',
            allowedValues: null,
          },
          {
            key: 'defaultLanguage',
            label: 'Default language',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'language',
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'payment_mode',
        label: 'Payment modes',
        description: 'Payment methods available on new workspaces.',
        multiple: true,
        minimumItems: 1,
        maximumItems: null,
        fields: [
          {
            key: 'name',
            label: 'Name',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'payment_term',
        label: 'Payment terms',
        description: 'Reusable due-date rules for invoices and estimates.',
        multiple: true,
        minimumItems: 1,
        maximumItems: null,
        fields: [
          {
            key: 'name',
            label: 'Name',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'rule',
            label: 'Rule',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: [
              'DUE_ON_RECEIPT',
              'NET_DAYS',
              'END_OF_MONTH',
              'END_OF_NEXT_MONTH',
            ],
          },
          {
            key: 'dueDays',
            label: 'Due days',
            valueType: 'integer',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'invoice_preference',
        label: 'Invoice preferences',
        description:
          'Default invoice behavior; tenant edits remain authoritative.',
        multiple: false,
        minimumItems: 1,
        maximumItems: 1,
        fields: [
          {
            key: 'defaultTaxBehavior',
            label: 'Tax behavior',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: ['EXCLUSIVE', 'INCLUSIVE'],
          },
          {
            key: 'lateFeesEnabled',
            label: 'Late fees enabled',
            valueType: 'boolean',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'lateFeeCalculationType',
            label: 'Late fee calculation',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: ['PERCENTAGE', 'FIXED'],
          },
          {
            key: 'lateFeePercent',
            label: 'Late fee percent',
            valueType: 'decimal',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'lateFeeAmount',
            label: 'Late fee amount',
            valueType: 'integer',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'lateFeeGraceDays',
            label: 'Grace days',
            valueType: 'integer',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'lateFeeGenerateAsDraft',
            label: 'Generate as draft',
            valueType: 'boolean',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'tax_authority',
        label: 'Tax authorities',
        description:
          'Tax administrations available to newly created organizations.',
        multiple: true,
        minimumItems: 1,
        maximumItems: null,
        fields: [
          {
            key: 'name',
            label: 'Name',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'description',
            label: 'Description',
            valueType: 'string',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'countryCode',
            label: 'Country',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'country',
            allowedValues: null,
          },
        ],
      },
      {
        resourceType: 'tax_rate',
        label: 'Tax rates',
        description:
          'Tax rates created for newly provisioned finance workspaces.',
        multiple: true,
        minimumItems: 1,
        maximumItems: null,
        fields: [
          {
            key: 'name',
            label: 'Name',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'description',
            label: 'Description',
            valueType: 'string',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'taxType',
            label: 'Tax type',
            valueType: 'string',
            required: false,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'rate',
            label: 'Rate',
            valueType: 'decimal',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'inclusive',
            label: 'Inclusive',
            valueType: 'boolean',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'authority',
            label: 'Tax authority',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'tax_authority',
            allowedValues: null,
          },
        ],
      },
    ])
  })

  it('returns organization catalog', () => {
    const defs = catalogDefinitions('organization', '')
    expect(defs).toEqual([
      {
        resourceType: 'organization_profile',
        label: 'Organization profile',
        description: 'Defaults for the global organization record.',
        multiple: false,
        minimumItems: 0,
        maximumItems: 1,
        fields: [
          {
            key: 'countryCode',
            label: 'Country',
            valueType: 'reference',
            required: true,
            referenceNamespace: 'country',
            allowedValues: null,
          },
          {
            key: 'language',
            label: 'Language',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
          {
            key: 'timezone',
            label: 'Timezone',
            valueType: 'string',
            required: true,
            referenceNamespace: null,
            allowedValues: null,
          },
        ],
      },
    ])
  })

  it('returns billing application catalog', () => {
    const defs = catalogDefinitions('application', '876-billing')
    expect(defs).toHaveLength(1)
    expect(defs[0]!.resourceType).toBe('document_preference')
    expect(defs[0]!.multiple).toBe(true)
    expect(defs[0]!.minimumItems).toBe(0)
    expect(defs[0]!.maximumItems).toBeNull()
    expect(
      defs[0]!.fields.find((f) => f.key === 'documentType')!.allowedValues
    ).toEqual(['invoice', 'quote', 'estimate', 'credit_note'])
  })

  it('returns empty for unknown application', () => {
    expect(catalogDefinitions('application', 'unknown')).toEqual([])
  })
})

describe('validateDraft', () => {
  it('passes a complete valid finance draft', () => {
    const issues = validateDraft('finance', '', minimalFinanceDraft())
    expect(issues).toEqual([])
  })

  it('rejects embedded finance dependency on non-application target', () => {
    const issues = validateDraft(
      'finance',
      '',
      minimalFinanceDraft({ financeDependency: 'embedded' })
    )
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_target_contract',
          path: 'finance_dependency',
        }),
      ])
    )
  })

  it('allows embedded dependency on application target', () => {
    const draft: ProvisioningDraftReplace = {
      financeDependency: 'embedded',
      resources: [],
    }
    const issues = validateDraft('application', '876-billing', draft)
    expect(
      issues.find((i) => i.code === 'invalid_target_contract')
    ).toBeUndefined()
  })

  it('flags unknown resource type', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'unknown_type',
          key: 'k1',
          position: 0,
          properties: [],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown_resource_type',
          path: 'resources.0.resource_type',
        }),
      ])
    )
  })

  it('flags missing required property', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'currency',
          key: 'usd',
          position: 0,
          properties: [
            prop('code', 'string', { stringValue: 'USD' }),
            // missing name and minorUnit
          ],
        },
        // add the rest to satisfy minimums so only missing_property is tested
        {
          resourceType: 'workspace',
          key: 'main',
          position: 1,
          properties: [
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
            prop('baseCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultLanguage', 'reference', {
              referenceNamespace: 'language',
              referenceKey: 'en',
            }),
          ],
        },
        {
          resourceType: 'payment_mode',
          key: 'card',
          position: 2,
          properties: [prop('name', 'string')],
        },
        {
          resourceType: 'payment_term',
          key: 'net30',
          position: 3,
          properties: [
            prop('name', 'string'),
            prop('rule', 'string', { stringValue: 'NET_DAYS' }),
            prop('dueDays', 'integer', { integerValue: 30 }),
          ],
        },
        {
          resourceType: 'invoice_preference',
          key: 'prefs',
          position: 4,
          properties: [
            prop('defaultTaxBehavior', 'string', { stringValue: 'EXCLUSIVE' }),
            prop('lateFeesEnabled', 'boolean', { booleanValue: true }),
            prop('lateFeeCalculationType', 'string', {
              stringValue: 'PERCENTAGE',
            }),
            prop('lateFeeGraceDays', 'integer', { integerValue: 5 }),
            prop('lateFeeGenerateAsDraft', 'boolean', { booleanValue: false }),
          ],
        },
        {
          resourceType: 'tax_authority',
          key: 'irs',
          position: 5,
          properties: [
            prop('name', 'string'),
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
          ],
        },
        {
          resourceType: 'tax_rate',
          key: 'vat',
          position: 6,
          properties: [
            prop('name', 'string'),
            prop('rate', 'decimal', { decimalValue: '20.00' }),
            prop('inclusive', 'boolean', { booleanValue: false }),
            prop('authority', 'reference', {
              referenceNamespace: 'tax_authority',
              referenceKey: 'irs',
            }),
          ],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_property',
          path: 'resources.0.properties.name',
        }),
        expect.objectContaining({
          code: 'missing_property',
          path: 'resources.0.properties.minorUnit',
        }),
      ])
    )
  })

  it('flags invalid property type', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'currency',
          key: 'usd',
          position: 0,
          properties: [
            prop('code', 'string', {
              valueType: 'integer',
              integerValue: 1,
              stringValue: null,
            } as never),
            prop('name', 'string'),
            prop('minorUnit', 'integer', { integerValue: 2 }),
          ],
        },
        {
          resourceType: 'workspace',
          key: 'main',
          position: 1,
          properties: [
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
            prop('baseCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultLanguage', 'reference', {
              referenceNamespace: 'language',
              referenceKey: 'en',
            }),
          ],
        },
        {
          resourceType: 'payment_mode',
          key: 'card',
          position: 2,
          properties: [prop('name', 'string')],
        },
        {
          resourceType: 'payment_term',
          key: 'net30',
          position: 3,
          properties: [
            prop('name', 'string'),
            prop('rule', 'string', { stringValue: 'NET_DAYS' }),
            prop('dueDays', 'integer', { integerValue: 30 }),
          ],
        },
        {
          resourceType: 'invoice_preference',
          key: 'prefs',
          position: 4,
          properties: [
            prop('defaultTaxBehavior', 'string', { stringValue: 'EXCLUSIVE' }),
            prop('lateFeesEnabled', 'boolean', { booleanValue: true }),
            prop('lateFeeCalculationType', 'string', {
              stringValue: 'PERCENTAGE',
            }),
            prop('lateFeeGraceDays', 'integer', { integerValue: 5 }),
            prop('lateFeeGenerateAsDraft', 'boolean', { booleanValue: false }),
          ],
        },
        {
          resourceType: 'tax_authority',
          key: 'irs',
          position: 5,
          properties: [
            prop('name', 'string'),
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
          ],
        },
        {
          resourceType: 'tax_rate',
          key: 'vat',
          position: 6,
          properties: [
            prop('name', 'string'),
            prop('rate', 'decimal', { decimalValue: '20.00' }),
            prop('inclusive', 'boolean', { booleanValue: false }),
            prop('authority', 'reference', {
              referenceNamespace: 'tax_authority',
              referenceKey: 'irs',
            }),
          ],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_property_type',
          path: 'resources.0.properties.code.value_type',
        }),
      ])
    )
  })

  it('flags invalid reference namespace', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'workspace',
          key: 'main',
          position: 0,
          properties: [
            prop('countryCode', 'reference', {
              referenceNamespace: 'wrong',
              referenceKey: 'US',
            }),
            prop('baseCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultLanguage', 'reference', {
              referenceNamespace: 'language',
              referenceKey: 'en',
            }),
          ],
        },
        {
          resourceType: 'currency',
          key: 'usd',
          position: 1,
          properties: [
            prop('code', 'string', { stringValue: 'USD' }),
            prop('name', 'string'),
            prop('minorUnit', 'integer', { integerValue: 2 }),
          ],
        },
        {
          resourceType: 'payment_mode',
          key: 'card',
          position: 2,
          properties: [prop('name', 'string')],
        },
        {
          resourceType: 'payment_term',
          key: 'net30',
          position: 3,
          properties: [
            prop('name', 'string'),
            prop('rule', 'string', { stringValue: 'NET_DAYS' }),
            prop('dueDays', 'integer', { integerValue: 30 }),
          ],
        },
        {
          resourceType: 'invoice_preference',
          key: 'prefs',
          position: 4,
          properties: [
            prop('defaultTaxBehavior', 'string', { stringValue: 'EXCLUSIVE' }),
            prop('lateFeesEnabled', 'boolean', { booleanValue: true }),
            prop('lateFeeCalculationType', 'string', {
              stringValue: 'PERCENTAGE',
            }),
            prop('lateFeeGraceDays', 'integer', { integerValue: 5 }),
            prop('lateFeeGenerateAsDraft', 'boolean', { booleanValue: false }),
          ],
        },
        {
          resourceType: 'tax_authority',
          key: 'irs',
          position: 5,
          properties: [
            prop('name', 'string'),
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
          ],
        },
        {
          resourceType: 'tax_rate',
          key: 'vat',
          position: 6,
          properties: [
            prop('name', 'string'),
            prop('rate', 'decimal', { decimalValue: '20.00' }),
            prop('inclusive', 'boolean', { booleanValue: false }),
            prop('authority', 'reference', {
              referenceNamespace: 'tax_authority',
              referenceKey: 'irs',
            }),
          ],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_reference_namespace',
          path: 'resources.0.properties.countryCode.reference_namespace',
        }),
      ])
    )
  })

  it('flags invalid allowed-value', () => {
    const issues = validateDraft('finance', '', {
      ...minimalFinanceDraft(),
      resources: minimalFinanceDraft().resources.map((r) =>
        r.resourceType === 'payment_term'
          ? {
              ...r,
              properties: r.properties.map((p) =>
                p.key === 'rule' ? { ...p, stringValue: 'INVALID' } : p
              ),
            }
          : r
      ),
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_property_value' }),
      ])
    )
  })

  it('flags unknown property', () => {
    const issues = validateDraft('finance', '', {
      ...minimalFinanceDraft(),
      resources: [
        {
          resourceType: 'currency',
          key: 'usd',
          position: 0,
          properties: [
            prop('code', 'string', { stringValue: 'USD' }),
            prop('name', 'string'),
            prop('minorUnit', 'integer', { integerValue: 2 }),
            prop('extra', 'string', { stringValue: 'oops' }),
          ],
        },
        ...minimalFinanceDraft().resources.slice(1),
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown_property',
          path: 'resources.0.properties.extra',
        }),
      ])
    )
  })

  it('flags cardinality violation for singleton resource', () => {
    const issues = validateDraft('finance', '', {
      ...minimalFinanceDraft(),
      resources: [
        ...minimalFinanceDraft().resources,
        {
          resourceType: 'workspace',
          key: 'second',
          position: 99,
          properties: [
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
            prop('baseCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultCurrency', 'reference', {
              referenceNamespace: 'currency',
              referenceKey: 'usd',
            }),
            prop('defaultLanguage', 'reference', {
              referenceNamespace: 'language',
              referenceKey: 'en',
            }),
          ],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'resource_cardinality' }),
      ])
    )
  })

  it('flags missing minimum items', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'resource_minimum' }),
      ])
    )
    // finance has 7 resource types each requiring at least 1
    expect(issues.filter((i) => i.code === 'resource_minimum')).toHaveLength(7)
  })

  it('flags unresolved reference within draft', () => {
    const issues = validateDraft('finance', '', {
      ...minimalFinanceDraft(),
      resources: minimalFinanceDraft().resources.map((r) =>
        r.resourceType === 'tax_rate'
          ? {
              ...r,
              properties: r.properties.map((p) =>
                p.key === 'authority' ? { ...p, referenceKey: 'missing' } : p
              ),
            }
          : r
      ),
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unresolved_reference' }),
      ])
    )
  })

  it('flags duplicate unique property', () => {
    const issues = validateDraft('application', '876-billing', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'document_preference',
          key: 'pref1',
          position: 0,
          properties: [
            prop('documentType', 'string', { stringValue: 'invoice' }),
          ],
        },
        {
          resourceType: 'document_preference',
          key: 'pref2',
          position: 1,
          properties: [
            prop('documentType', 'string', { stringValue: 'invoice' }),
          ],
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate_unique_property' }),
      ])
    )
  })

  it('does not flag unique property when values differ', () => {
    const issues = validateDraft('application', '876-billing', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'document_preference',
          key: 'pref1',
          position: 0,
          properties: [
            prop('documentType', 'string', { stringValue: 'invoice' }),
          ],
        },
        {
          resourceType: 'document_preference',
          key: 'pref2',
          position: 1,
          properties: [
            prop('documentType', 'string', { stringValue: 'quote' }),
          ],
        },
      ],
    })
    expect(
      issues.filter((i) => i.code === 'duplicate_unique_property')
    ).toHaveLength(0)
  })

  it('ignores external reference namespaces not in registry', () => {
    // workspace.countryCode references "country" which is not a resource type
    // in the finance registry, so an unresolved value must not flag.
    const issues = validateDraft('finance', '', minimalFinanceDraft())
    expect(
      issues.filter((i) => i.code === 'unresolved_reference')
    ).toHaveLength(0)
  })
})
