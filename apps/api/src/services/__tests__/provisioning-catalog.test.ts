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
  ProvisioningResourceInput,
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

function baseFinanceResources(options: {
  countryCode?: string | null
} = {}): ProvisioningResourceInput[] {
  const workspaceProperties = [
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
  ]

  if (options.countryCode !== null)
    workspaceProperties.unshift(
      prop('countryCode', 'reference', {
        referenceNamespace: 'country',
        referenceKey: options.countryCode ?? 'US',
      })
    )

  return [
    {
      resourceType: 'currency',
      key: 'usd',
      position: 0,
      properties: [
        prop('code', 'string', { stringValue: 'USD' }),
        prop('name', 'string', { stringValue: 'US Dollar' }),
        prop('minorUnit', 'integer', { integerValue: 2 }),
      ],
    },
    {
      resourceType: 'workspace',
      key: 'default',
      position: 10,
      properties: workspaceProperties,
    },
    {
      resourceType: 'payment_mode',
      key: 'card',
      position: 20,
      properties: [prop('name', 'string', { stringValue: 'Card' })],
    },
    {
      resourceType: 'payment_term',
      key: 'net30',
      position: 30,
      properties: [
        prop('name', 'string', { stringValue: 'Net 30' }),
        prop('rule', 'string', { stringValue: 'NET_DAYS' }),
        prop('dueDays', 'integer', { integerValue: 30 }),
      ],
    },
    {
      resourceType: 'invoice_preference',
      key: 'default',
      position: 40,
      properties: [
        prop('defaultTaxBehavior', 'string', { stringValue: 'EXCLUSIVE' }),
        prop('lateFeesEnabled', 'boolean', { booleanValue: false }),
        prop('lateFeeCalculationType', 'string', {
          stringValue: 'PERCENTAGE',
        }),
        prop('lateFeeGraceDays', 'integer', { integerValue: 0 }),
        prop('lateFeeGenerateAsDraft', 'boolean', { booleanValue: true }),
      ],
    },
  ]
}

function minimalFinanceDraft(
  overrides: Partial<ProvisioningDraftReplace> = {}
): ProvisioningDraftReplace {
  return {
    financeDependency: 'none',
    resources: baseFinanceResources(),
    ...overrides,
  }
}

describe('resourceRegistry', () => {
  it('returns the registered catalog for each target family', () => {
    expect(resourceRegistry('finance', '')).toBe(FINANCE_RESOURCES)
    expect(resourceRegistry('organization', '')).toBe(ORGANIZATION_RESOURCES)
    expect(resourceRegistry('application', '876-billing')).toBe(
      APPLICATION_RESOURCES['876-billing']
    )
    expect(resourceRegistry('application', 'unknown-app')).toEqual({})
  })
})

describe('catalogDefinitions', () => {
  it('keeps country optional and currency/language required on workspace', () => {
    const workspace = catalogDefinitions('finance', '').find(
      (definition) => definition.resourceType === 'workspace'
    )

    expect(workspace).toMatchObject({
      multiple: false,
      minimumItems: 1,
      maximumItems: 1,
    })
    expect(workspace?.fields.find((field) => field.key === 'countryCode')).toMatchObject(
      {
        required: false,
        valueType: 'reference',
        referenceNamespace: 'country',
      }
    )
    expect(workspace?.fields.find((field) => field.key === 'baseCurrency')).toMatchObject(
      { required: true, referenceNamespace: 'currency' }
    )
    expect(
      workspace?.fields.find((field) => field.key === 'defaultLanguage')
    ).toMatchObject({ required: true, referenceNamespace: 'language' })
  })

  it('allows tax configuration to be absent', () => {
    const definitions = catalogDefinitions('finance', '')

    expect(
      definitions.find((definition) => definition.resourceType === 'tax_authority')
    ).toMatchObject({ minimumItems: 0, multiple: true })
    expect(
      definitions.find(
        (definition) => definition.resourceType === 'tax_jurisdiction'
      )
    ).toMatchObject({ minimumItems: 0, multiple: true })
    expect(
      definitions.find((definition) => definition.resourceType === 'tax_rate')
    ).toMatchObject({ minimumItems: 0, multiple: true })
  })

  it('describes hierarchical international tax jurisdictions', () => {
    const jurisdiction = catalogDefinitions('finance', '').find(
      (definition) => definition.resourceType === 'tax_jurisdiction'
    )

    expect(jurisdiction?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'countryCode',
          referenceNamespace: 'country',
          required: true,
        }),
        expect.objectContaining({
          key: 'type',
          allowedValues: [
            'country',
            'state',
            'province',
            'county',
            'city',
            'district',
            'other',
          ],
        }),
        expect.objectContaining({
          key: 'parent',
          referenceNamespace: 'tax_jurisdiction',
          required: false,
        }),
      ])
    )
  })

  it('supports jurisdiction and effective dates on tax rates', () => {
    const taxRate = catalogDefinitions('finance', '').find(
      (definition) => definition.resourceType === 'tax_rate'
    )

    expect(taxRate?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'taxType', required: false }),
        expect.objectContaining({
          key: 'authority',
          required: false,
          referenceNamespace: 'tax_authority',
        }),
        expect.objectContaining({
          key: 'jurisdiction',
          required: false,
          referenceNamespace: 'tax_jurisdiction',
        }),
        expect.objectContaining({
          key: 'effectiveFrom',
          valueType: 'string',
          required: false,
        }),
        expect.objectContaining({
          key: 'effectiveUntil',
          valueType: 'string',
          required: false,
        }),
      ])
    )
  })

  it('keeps billing document preferences optional', () => {
    const definitions = catalogDefinitions('application', '876-billing')
    expect(definitions).toHaveLength(1)
    expect(definitions[0]).toMatchObject({
      resourceType: 'document_preference',
      multiple: true,
      minimumItems: 0,
      maximumItems: null,
    })
  })
})

describe('validateDraft', () => {
  it('passes a basic finance draft without tax resources', () => {
    expect(validateDraft('finance', '', minimalFinanceDraft())).toEqual([])
  })

  it('passes a location-neutral fallback workspace without country', () => {
    const draft = minimalFinanceDraft({
      resources: baseFinanceResources({ countryCode: null }),
    })

    expect(validateDraft('finance', '', draft)).toEqual([])
  })

  it('accepts hierarchical jurisdiction references and dated tax rates', () => {
    const resources = [
      ...baseFinanceResources(),
      {
        resourceType: 'tax_jurisdiction',
        key: 'us',
        position: 50,
        properties: [
          prop('name', 'string', { stringValue: 'United States' }),
          prop('countryCode', 'reference', {
            referenceNamespace: 'country',
            referenceKey: 'US',
          }),
          prop('type', 'string', { stringValue: 'country' }),
          prop('code', 'string', { stringValue: 'US' }),
        ],
      },
      {
        resourceType: 'tax_jurisdiction',
        key: 'us-ca',
        position: 60,
        properties: [
          prop('name', 'string', { stringValue: 'California' }),
          prop('countryCode', 'reference', {
            referenceNamespace: 'country',
            referenceKey: 'US',
          }),
          prop('type', 'string', { stringValue: 'state' }),
          prop('code', 'string', { stringValue: 'US-CA' }),
          prop('parent', 'reference', {
            referenceNamespace: 'tax_jurisdiction',
            referenceKey: 'us',
          }),
        ],
      },
      {
        resourceType: 'tax_authority',
        key: 'ca-cdtfa',
        position: 70,
        properties: [
          prop('name', 'string', {
            stringValue: 'California Department of Tax and Fee Administration',
          }),
          prop('countryCode', 'reference', {
            referenceNamespace: 'country',
            referenceKey: 'US',
          }),
          prop('jurisdiction', 'reference', {
            referenceNamespace: 'tax_jurisdiction',
            referenceKey: 'us-ca',
          }),
        ],
      },
      {
        resourceType: 'tax_rate',
        key: 'ca-sales-tax',
        position: 80,
        properties: [
          prop('name', 'string', { stringValue: 'California sales tax' }),
          prop('taxType', 'string', { stringValue: 'SALES_TAX' }),
          prop('rate', 'decimal', { decimalValue: '7.25' }),
          prop('inclusive', 'boolean', { booleanValue: false }),
          prop('authority', 'reference', {
            referenceNamespace: 'tax_authority',
            referenceKey: 'ca-cdtfa',
          }),
          prop('jurisdiction', 'reference', {
            referenceNamespace: 'tax_jurisdiction',
            referenceKey: 'us-ca',
          }),
          prop('effectiveFrom', 'string', { stringValue: '2026-01-01' }),
        ],
      },
    ] satisfies ProvisioningResourceInput[]

    expect(
      validateDraft('finance', '', {
        financeDependency: 'none',
        resources,
      })
    ).toEqual([])
  })

  it('rejects unresolved internal jurisdiction references', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        ...baseFinanceResources(),
        {
          resourceType: 'tax_jurisdiction',
          key: 'us-ca',
          position: 50,
          properties: [
            prop('name', 'string', { stringValue: 'California' }),
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
            prop('type', 'string', { stringValue: 'state' }),
            prop('parent', 'reference', {
              referenceNamespace: 'tax_jurisdiction',
              referenceKey: 'missing',
            }),
          ],
        },
      ],
    })

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unresolved_reference',
          path: 'resources.5.properties.parent',
        }),
      ])
    )
  })

  it('rejects an invalid jurisdiction type', () => {
    const issues = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        ...baseFinanceResources(),
        {
          resourceType: 'tax_jurisdiction',
          key: 'bad',
          position: 50,
          properties: [
            prop('name', 'string', { stringValue: 'Bad jurisdiction' }),
            prop('countryCode', 'reference', {
              referenceNamespace: 'country',
              referenceKey: 'US',
            }),
            prop('type', 'string', { stringValue: 'planet' }),
          ],
        },
      ],
    })

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_property_value' }),
      ])
    )
  })

  it('rejects embedded finance dependency on non-application targets', () => {
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

  it('allows embedded finance dependency on application targets', () => {
    const issues = validateDraft('application', '876-billing', {
      financeDependency: 'embedded',
      resources: [],
    })

    expect(
      issues.find((issue) => issue.code === 'invalid_target_contract')
    ).toBeUndefined()
  })

  it('flags unknown resource types and missing required properties', () => {
    const unknown = validateDraft('finance', '', {
      financeDependency: 'none',
      resources: [
        {
          resourceType: 'unknown_type',
          key: 'unknown',
          position: 0,
          properties: [],
        },
      ],
    })
    expect(unknown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown_resource_type' }),
      ])
    )

    const resources = baseFinanceResources()
    resources[0] = {
      ...resources[0]!,
      properties: [prop('code', 'string', { stringValue: 'USD' })],
    }
    const missing = validateDraft('finance', '', {
      financeDependency: 'none',
      resources,
    })
    expect(missing).toEqual(
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

  it('requires exactly one default CRM priority', () => {
    const draft: ProvisioningDraftReplace = {
      financeDependency: 'embedded',
      resources: [
        {
          resourceType: 'request_priority',
          key: 'normal',
          position: 0,
          properties: [
            prop('name', 'string', { stringValue: 'Normal' }),
            prop('weight', 'integer', { integerValue: 20 }),
            prop('sortOrder', 'integer', { integerValue: 20 }),
            prop('isDefault', 'boolean', { booleanValue: false }),
          ],
        },
        {
          resourceType: 'request_category',
          key: 'general',
          position: 10,
          properties: [
            prop('name', 'string', { stringValue: 'General' }),
            prop('sortOrder', 'integer', { integerValue: 0 }),
            prop('isActive', 'boolean', { booleanValue: true }),
          ],
        },
      ],
    }

    expect(validateDraft('application', '876-crm', draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'crm_default_priority' }),
      ])
    )
  })
})
