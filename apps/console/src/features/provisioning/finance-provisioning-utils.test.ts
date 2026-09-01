import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifestRevision,
} from '@876/platform/compat'
import { describe, expect, it } from 'vitest'

import {
  buildFinanceDraft,
  emptyRow,
  financeFieldOptions,
  formatOptionLabel,
  getResourceTypeColor,
  revisionRows,
  rowReferenceKey,
} from './finance-provisioning-utils'

const catalog: AdminProvisioningCatalog = {
  object: 'provisioning_catalog',
  manifest_version: 1,
  target_type: 'finance',
  resource_types: [
    {
      resource_type: 'currency',
      label: 'Currencies',
      description: 'Currency defaults',
      multiple: true,
      minimum_items: 1,
      maximum_items: null,
      fields: [
        {
          key: 'code',
          label: 'ISO code',
          value_type: 'string',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
        {
          key: 'minorUnit',
          label: 'Minor unit',
          value_type: 'integer',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
      ],
    },
    {
      resource_type: 'tax_rate',
      label: 'Tax rates',
      description: 'Tax defaults',
      multiple: true,
      minimum_items: 1,
      maximum_items: null,
      fields: [
        {
          key: 'rate',
          label: 'Rate',
          value_type: 'decimal',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
        {
          key: 'inclusive',
          label: 'Inclusive',
          value_type: 'boolean',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
        {
          key: 'authority',
          label: 'Authority',
          value_type: 'reference',
          required: true,
          reference_namespace: 'tax_authority',
          allowed_values: null,
        },
      ],
    },
  ],
}

describe('finance provisioning utilities', () => {
  it('round-trips typed revision properties into editable rows', () => {
    const revision = {
      resources: [
        {
          id: 'resource_1',
          resource_type: 'currency',
          key: 'JMD',
          position: 10,
          properties: [
            {
              id: 'property_1',
              object: 'provisioning_property',
              key: 'minorUnit',
              value_type: 'integer',
              string_value: null,
              integer_value: '2',
              decimal_value: null,
              boolean_value: null,
              reference_namespace: null,
              reference_key: null,
            },
          ],
        },
      ],
    } as AdminProvisioningManifestRevision

    expect(revisionRows(revision)).toEqual([
      {
        localId: 'resource_1',
        resourceType: 'currency',
        key: 'JMD',
        values: { minorUnit: '2' },
      },
    ])
  })

  it('builds any number of typed resources from the catalog shape', () => {
    const draft = buildFinanceDraft(
      catalog,
      [
        {
          localId: 'jmd',
          resourceType: 'currency',
          key: 'JMD',
          values: { code: 'JMD', minorUnit: '2' },
        },
        {
          localId: 'usd',
          resourceType: 'currency',
          key: '',
          values: { code: 'USD', minorUnit: '2' },
        },
        {
          localId: 'gct',
          resourceType: 'tax_rate',
          key: 'gct_standard',
          values: { rate: '15.0', inclusive: false, authority: 'taj' },
        },
      ],
      null
    )

    expect(draft.resources).toHaveLength(3)
    expect(draft.resources?.[1]).toMatchObject({
      resource_type: 'currency',
      key: 'usd',
      properties: expect.arrayContaining([
        expect.objectContaining({ integer_value: '2' }),
      ]),
    })
    expect(draft.resources?.[2]?.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ decimal_value: '15.0' }),
        expect.objectContaining({ boolean_value: false }),
        expect.objectContaining({
          reference_namespace: 'tax_authority',
          reference_key: 'taj',
        }),
      ])
    )
  })

  it('initializes new rows from catalog defaults without fixing the count', () => {
    expect(emptyRow(catalog.resource_types[0]!, 'new-row')).toEqual({
      localId: 'new-row',
      resourceType: 'currency',
      key: '',
      values: { code: '', minorUnit: '' },
    })
  })

  it('falls back to the name when the reference code is blank', () => {
    expect(
      rowReferenceKey({
        localId: 'tax-authority',
        resourceType: 'tax_authority',
        key: '',
        values: { code: '   ', name: 'Tax Administration Jamaica' },
      })
    ).toBe('tax_administration_jamaica')
  })

  it('formats option labels to title case handling underscores and short words', () => {
    expect(formatOptionLabel('EXCLUSIVE')).toBe('Exclusive')
    expect(formatOptionLabel('INCLUSIVE')).toBe('Inclusive')
    expect(formatOptionLabel('DUE_ON_RECEIPT')).toBe('Due on Receipt')
    expect(formatOptionLabel('END_OF_MONTH')).toBe('End of Month')
    expect(formatOptionLabel('END_OF_NEXT_MONTH')).toBe('End of Next Month')
    expect(formatOptionLabel('credit_note')).toBe('Credit Note')
  })

  it('uses supplied language catalog options without a hard-coded fallback', () => {
    const languageField = {
      key: 'defaultLanguage',
      label: 'Default language',
      value_type: 'reference' as const,
      required: true,
      reference_namespace: 'language',
      allowed_values: null,
    }

    expect(financeFieldOptions(languageField, [], [])).toEqual([])
    expect(
      financeFieldOptions(
        languageField,
        [],
        [{ value: 'en', label: 'English (en)' }]
      )
    ).toEqual([{ value: 'en', label: 'English (en)' }])
  })

  it('maps resource types to matching semantic color classes', () => {
    expect(getResourceTypeColor('workspace')).toBe(
      'text-sky-500 dark:text-sky-400'
    )
    expect(getResourceTypeColor('currency')).toBe(
      'text-amber-500 dark:text-amber-400'
    )
    expect(getResourceTypeColor('payment_mode')).toBe(
      'text-indigo-500 dark:text-indigo-400'
    )
    expect(getResourceTypeColor('payment_term')).toBe(
      'text-emerald-500 dark:text-emerald-400'
    )
    expect(getResourceTypeColor('invoice_preference')).toBe(
      'text-rose-500 dark:text-rose-400'
    )
    expect(getResourceTypeColor('tax_authority')).toBe(
      'text-teal-500 dark:text-teal-400'
    )
    expect(getResourceTypeColor('tax_rate')).toBe(
      'text-violet-500 dark:text-violet-400'
    )
    expect(getResourceTypeColor('request_priority')).toBe(
      'text-amber-500 dark:text-amber-400'
    )
    expect(getResourceTypeColor('request_category')).toBe(
      'text-emerald-500 dark:text-emerald-400'
    )
    expect(getResourceTypeColor('request_subcategory')).toBe(
      'text-teal-500 dark:text-teal-400'
    )
    expect(getResourceTypeColor('app_role')).toBe(
      'text-purple-500 dark:text-purple-400'
    )
    expect(getResourceTypeColor('unknown_custom_resource')).toMatch(
      /^text-(blue|emerald|purple|amber|rose|cyan|indigo|teal)-500 dark:text-(blue|emerald|purple|amber|rose|cyan|indigo|teal)-400$/
    )
  })
})
