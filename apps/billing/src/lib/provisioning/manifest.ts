import type { PlatformProvisioningProperty } from '@876/core/platform'

import { createBackgroundPlatformClient } from '@/lib/876/platform-client'

export interface BillingProvisioningManifest {
  object: 'provisioning_manifest'
  target: 'finance/shared'
  manifestVersion: 1
  revision: number
  reconciliation: 'create_missing'
  preserveTenantOverrides: true
  defaults: {
    countryCode: string
    baseCurrency: string
    defaultCurrency: string
    defaultLanguage: string
    currencies: string[]
    paymentModes: string[]
    paymentTerms: Array<{
      name: string
      rule: 'DUE_ON_RECEIPT' | 'NET_DAYS' | 'END_OF_MONTH' | 'END_OF_NEXT_MONTH'
      dueDays: number
    }>
    invoicePreferences: {
      defaultTaxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
      lateFeesEnabled: boolean
      lateFeeCalculationType: 'PERCENTAGE' | 'FIXED'
      lateFeePercent: number | null
      lateFeeAmount: bigint | null
      lateFeeGraceDays: number
      lateFeeGenerateAsDraft: boolean
    }
    taxAuthorities: Array<{
      key: string
      name: string
      description: string | null
      countryCode: string
    }>
    taxRates: Array<{
      authorityKey: string
      name: string
      description: string | null
      taxType: string | null
      rate: string
      inclusive: boolean
    }>
  }
  steps: Array<{ key: string; description: string }>
}

export interface BillingApplicationProvisioningManifest {
  object: 'application_provisioning_manifest'
  manifestVersion: 1
  revision: number
  documentPreferences: Array<{
    documentType: 'QUOTE' | 'INVOICE' | 'ESTIMATE' | 'CREDIT_NOTE'
    customerNote: string | null
    termsAndConditions: string | null
  }>
}

/** Loads Billing's typed day-zero recipe from the platform control plane. */
export async function loadBillingProvisioningManifest(): Promise<BillingProvisioningManifest> {
  const result =
    await createBackgroundPlatformClient().provisioning.retrievePublished(
      'finance',
      'shared'
    )
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Billing provisioning configuration is missing.'
    )

  const profile = result.data
  const resource = (type: string, key = 'default') => {
    const row = profile.resources.find(
      (candidate) => candidate.resource_type === type && candidate.key === key
    )
    if (!row) throw new Error(`Missing provisioning resource: ${type}/${key}.`)
    return new Map(row.properties.map((property) => [property.key, property]))
  }

  const workspace = resource('workspace')
  const invoicePreference = resource('invoice_preference')
  const currencies = profile.resources
    .filter((row) => row.resource_type === 'currency')
    .map((row) => stringValue(propertyMap(row.properties), 'code'))
  const paymentModes = profile.resources
    .filter((row) => row.resource_type === 'payment_mode')
    .map((row) => stringValue(propertyMap(row.properties), 'name'))
  const paymentTerms = profile.resources
    .filter((row) => row.resource_type === 'payment_term')
    .map((row) => {
      const values = propertyMap(row.properties)
      const rule = stringValue(values, 'rule')
      if (!isPaymentTermRule(rule))
        throw new Error(`Invalid payment-term rule: ${rule}.`)
      return {
        name: stringValue(values, 'name'),
        rule,
        dueDays: integerValue(values, 'dueDays'),
      }
    })
  const taxAuthorities = profile.resources
    .filter((row) => row.resource_type === 'tax_authority')
    .map((row) => {
      const values = propertyMap(row.properties)
      return {
        key: row.key,
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        countryCode: stringValue(values, 'countryCode'),
      }
    })
  const taxRates = profile.resources
    .filter((row) => row.resource_type === 'tax_rate')
    .map((row) => {
      const values = propertyMap(row.properties)
      return {
        authorityKey: stringValue(values, 'authority'),
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        taxType: optionalStringValue(values, 'taxType'),
        rate: decimalValue(values, 'rate'),
        inclusive: booleanValue(values, 'inclusive'),
      }
    })
  if (
    currencies.length === 0 ||
    paymentModes.length === 0 ||
    paymentTerms.length === 0 ||
    taxAuthorities.length === 0 ||
    taxRates.length === 0
  )
    throw new Error(
      'Billing provisioning requires currencies, payment modes, payment terms, tax authorities, and tax rates.'
    )

  return {
    object: 'provisioning_manifest',
    target: 'finance/shared',
    manifestVersion: profile.manifest_version,
    revision: profile.revision,
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    defaults: {
      countryCode: stringValue(workspace, 'countryCode'),
      baseCurrency: stringValue(workspace, 'baseCurrency'),
      defaultCurrency: stringValue(workspace, 'defaultCurrency'),
      defaultLanguage: stringValue(workspace, 'defaultLanguage'),
      currencies,
      paymentModes,
      paymentTerms,
      invoicePreferences: {
        defaultTaxBehavior: enumValue(invoicePreference, 'defaultTaxBehavior', [
          'EXCLUSIVE',
          'INCLUSIVE',
        ] as const),
        lateFeesEnabled: booleanValue(invoicePreference, 'lateFeesEnabled'),
        lateFeeCalculationType: enumValue(
          invoicePreference,
          'lateFeeCalculationType',
          ['PERCENTAGE', 'FIXED'] as const
        ),
        lateFeePercent: optionalNumberValue(
          invoicePreference,
          'lateFeePercent'
        ),
        lateFeeAmount: optionalBigIntValue(invoicePreference, 'lateFeeAmount'),
        lateFeeGraceDays: integerValue(invoicePreference, 'lateFeeGraceDays'),
        lateFeeGenerateAsDraft: booleanValue(
          invoicePreference,
          'lateFeeGenerateAsDraft'
        ),
      },
      taxAuthorities,
      taxRates,
    },
    steps: profile.steps.map(({ key, description }) => ({ key, description })),
  }
}

/** Loads document defaults owned by Billing's application manifest. */
export async function loadBillingApplicationProvisioningManifest(
  targetKey = '876-billing'
): Promise<BillingApplicationProvisioningManifest> {
  const result =
    await createBackgroundPlatformClient().provisioning.retrievePublished(
      'application',
      targetKey
    )
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ??
        'Billing application provisioning configuration is missing.'
    )

  const profile = result.data
  const documentPreferences = profile.resources
    .filter((row) => row.resource_type === 'document_preference')
    .map((row) => {
      const values = propertyMap(row.properties)
      return {
        documentType: documentTypeValue(values, 'documentType'),
        customerNote: optionalStringValue(values, 'customerNote'),
        termsAndConditions: optionalStringValue(values, 'termsAndConditions'),
      }
    })

  return {
    object: 'application_provisioning_manifest',
    manifestVersion: profile.manifest_version,
    revision: profile.revision,
    documentPreferences,
  }
}

type Properties = Map<string, PlatformProvisioningProperty>

function propertyMap(properties: PlatformProvisioningProperty[]): Properties {
  return new Map(properties.map((property) => [property.key, property]))
}

function required(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) throw new Error(`Missing provisioning property: ${key}.`)
  return property
}

function stringValue(properties: Properties, key: string) {
  const value = required(properties, key)
  if (value.value_type === 'reference' && value.reference_key)
    return value.reference_key
  if (value.value_type === 'string' && value.string_value !== null)
    return value.string_value
  throw new Error(`Provisioning property ${key} must be a string or reference.`)
}

function optionalStringValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  return stringValue(properties, key)
}

function integerValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'integer' || property.integer_value === null)
    throw new Error(`Provisioning property ${key} must be an integer.`)
  const value = Number(property.integer_value)
  if (!Number.isSafeInteger(value))
    throw new Error(`Provisioning property ${key} exceeds a safe integer.`)
  return value
}

function decimalValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'decimal' || property.decimal_value === null)
    throw new Error(`Provisioning property ${key} must be a decimal.`)
  return property.decimal_value
}

function booleanValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'boolean' || property.boolean_value === null)
    throw new Error(`Provisioning property ${key} must be a boolean.`)
  return property.boolean_value
}

function optionalNumberValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  if (
    (property.value_type === 'decimal' && property.decimal_value !== null) ||
    (property.value_type === 'integer' && property.integer_value !== null)
  ) {
    const value = Number(
      property.decimal_value ?? property.integer_value ?? Number.NaN
    )
    if (!Number.isFinite(value))
      throw new Error(`Provisioning property ${key} must be finite.`)
    return value
  }
  throw new Error(`Provisioning property ${key} must be numeric.`)
}

function optionalBigIntValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  if (property.value_type !== 'integer' || property.integer_value === null)
    throw new Error(`Provisioning property ${key} must be an integer.`)
  return BigInt(property.integer_value)
}

function enumValue<const T extends readonly string[]>(
  properties: Properties,
  key: string,
  values: T
): T[number] {
  const value = stringValue(properties, key)
  if (!values.includes(value))
    throw new Error(`Provisioning property ${key} has an invalid value.`)
  return value as T[number]
}

function isPaymentTermRule(
  value: string
): value is BillingProvisioningManifest['defaults']['paymentTerms'][number]['rule'] {
  return [
    'DUE_ON_RECEIPT',
    'NET_DAYS',
    'END_OF_MONTH',
    'END_OF_NEXT_MONTH',
  ].includes(value)
}

function documentTypeValue(
  properties: Properties,
  key: string
): BillingApplicationProvisioningManifest['documentPreferences'][number]['documentType'] {
  const value = stringValue(properties, key)
  const mapped = {
    quote: 'QUOTE',
    invoice: 'INVOICE',
    estimate: 'ESTIMATE',
    credit_note: 'CREDIT_NOTE',
  } as const
  const documentType = mapped[value as keyof typeof mapped]
  if (!documentType)
    throw new Error(`Provisioning property ${key} has an invalid value.`)
  return documentType
}
