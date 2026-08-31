import type { ProvisioningSetupPolicyReplaceParams } from '@876/core/types/provisioning-policy'

import { provisioningDraftReplaceSchema } from './provisioning.schemas'
import type { ProvisioningDraftReplace } from './provisioning.schemas'
import type {
  ProvisioningImportApplicationManifest,
  ProvisioningImportSetup,
  ProvisioningImportSpecification,
} from './provisioning-import.schemas'

function stringProp(key: string, value: string) {
  return { key, value_type: 'string' as const, string_value: value }
}

function integerProp(key: string, value: number) {
  return { key, value_type: 'integer' as const, integer_value: value }
}

function decimalProp(key: string, value: string | number) {
  return { key, value_type: 'decimal' as const, decimal_value: String(value) }
}

function booleanProp(key: string, value: boolean) {
  return { key, value_type: 'boolean' as const, boolean_value: value }
}

function referenceProp(key: string, namespace: string, value: string) {
  return {
    key,
    value_type: 'reference' as const,
    reference_namespace: namespace,
    reference_key: value,
  }
}

function optionalStringProp(key: string, value: string | null | undefined) {
  return value == null || value === '' ? [] : [stringProp(key, value)]
}

function optionalReferenceProp(
  key: string,
  namespace: string,
  value: string | null | undefined
) {
  return value == null || value === ''
    ? []
    : [referenceProp(key, namespace, value)]
}

function step(key: string, description: string, position: number) {
  return { key, description, position }
}

export function buildSetupPolicy(
  spec: ProvisioningImportSpecification,
  setup: ProvisioningImportSetup
): ProvisioningSetupPolicyReplaceParams {
  return {
    conditions: setup.country_codes.map((countryCode) => ({
      group_key: `country-${countryCode.toLowerCase()}`,
      field: 'country' as const,
      operator: 'equals' as const,
      value: countryCode,
      priority: 100,
    })),
    entitlements: spec.default_entitlements.map((entry) => ({ ...entry })),
  }
}

export function buildFinanceImportDraft(
  spec: ProvisioningImportSpecification,
  setup: ProvisioningImportSetup
): ProvisioningDraftReplace {
  const currency = spec.currencies[setup.currency_code]
  if (!currency)
    throw new Error(`Unknown import currency: ${setup.currency_code}`)

  const resources: ProvisioningDraftReplace['resources'] = []
  let position = 10
  const push = (
    resource: Omit<ProvisioningDraftReplace['resources'][number], 'position'>
  ) => {
    resources.push({ ...resource, position })
    position += 10
  }

  push({
    resource_type: 'workspace',
    key: 'default',
    properties: [
      ...(setup.country_codes.length === 1
        ? [referenceProp('countryCode', 'country', setup.country_codes[0]!)]
        : []),
      referenceProp('baseCurrency', 'currency', setup.currency_code),
      referenceProp('defaultCurrency', 'currency', setup.currency_code),
      referenceProp('defaultLanguage', 'language', spec.default_language),
    ],
  })

  push({
    resource_type: 'currency',
    key: setup.currency_code,
    properties: [
      stringProp('code', setup.currency_code),
      stringProp('name', currency.name),
      ...optionalStringProp('numericCode', currency.numeric_code),
      integerProp('minorUnit', currency.minor_unit),
      ...optionalStringProp('symbol', currency.symbol),
    ],
  })

  for (const mode of spec.common_finance_defaults.payment_modes) {
    push({
      resource_type: 'payment_mode',
      key: mode.key,
      properties: [stringProp('name', mode.name)],
    })
  }

  for (const term of spec.common_finance_defaults.payment_terms) {
    push({
      resource_type: 'payment_term',
      key: term.key,
      properties: [
        stringProp('name', term.name),
        stringProp('rule', term.rule),
        integerProp('dueDays', term.due_days),
      ],
    })
  }

  const invoice = spec.common_finance_defaults.invoice_preference
  push({
    resource_type: 'invoice_preference',
    key: invoice.key,
    properties: [
      stringProp('defaultTaxBehavior', invoice.default_tax_behavior),
      booleanProp('lateFeesEnabled', invoice.late_fees_enabled),
      stringProp('lateFeeCalculationType', invoice.late_fee_calculation_type),
      ...(invoice.late_fee_percent == null
        ? []
        : [decimalProp('lateFeePercent', invoice.late_fee_percent)]),
      ...(invoice.late_fee_amount == null
        ? []
        : [integerProp('lateFeeAmount', invoice.late_fee_amount)]),
      integerProp('lateFeeGraceDays', invoice.late_fee_grace_days),
      booleanProp('lateFeeGenerateAsDraft', invoice.late_fee_generate_as_draft),
    ],
  })

  for (const code of setup.tax?.codes ?? []) {
    push({
      resource_type: 'tax_code',
      key: code.key,
      properties: [
        stringProp('name', code.name),
        ...optionalStringProp('description', code.description),
        ...optionalStringProp('code', code.code),
        ...optionalStringProp('scope', code.scope),
      ],
    })
  }

  for (const jurisdiction of setup.tax?.jurisdictions ?? []) {
    push({
      resource_type: 'tax_jurisdiction',
      key: jurisdiction.key,
      properties: [
        stringProp('name', jurisdiction.name),
        referenceProp('countryCode', 'country', jurisdiction.country_code),
        stringProp('type', jurisdiction.type),
        ...optionalStringProp('code', jurisdiction.code),
        ...optionalReferenceProp(
          'parent',
          'tax_jurisdiction',
          jurisdiction.parent
        ),
      ],
    })
  }

  for (const authority of setup.tax?.authorities ?? []) {
    push({
      resource_type: 'tax_authority',
      key: authority.key,
      properties: [
        stringProp('name', authority.name),
        ...optionalStringProp('description', authority.description),
        referenceProp('countryCode', 'country', authority.country_code),
        ...optionalReferenceProp(
          'jurisdiction',
          'tax_jurisdiction',
          authority.jurisdiction
        ),
      ],
    })
  }

  for (const rate of setup.tax?.rates ?? []) {
    push({
      resource_type: 'tax_rate',
      key: rate.key,
      properties: [
        stringProp('name', rate.name),
        ...optionalStringProp('description', rate.description),
        ...optionalStringProp('taxType', rate.tax_type),
        decimalProp('rate', rate.rate),
        booleanProp('inclusive', rate.inclusive),
        ...optionalReferenceProp('authority', 'tax_authority', rate.authority),
        ...optionalReferenceProp(
          'jurisdiction',
          'tax_jurisdiction',
          rate.jurisdiction
        ),
        ...optionalReferenceProp('taxCode', 'tax_code', rate.tax_code),
        ...optionalStringProp('effectiveFrom', rate.effective_from),
        ...optionalStringProp('effectiveUntil', rate.effective_until),
      ],
    })
  }

  return provisioningDraftReplaceSchema.parse({
    manifest_version: 1,
    reconciliation: spec.common_finance_defaults.reconciliation,
    preserve_tenant_overrides:
      spec.common_finance_defaults.preserve_tenant_overrides,
    finance_dependency: 'none',
    finance_scopes: [],
    resources,
    steps: [
      step('workspace', 'Configure finance workspace defaults.', 10),
      step('currencies', 'Configure workspace currencies.', 20),
      step('payment-modes', 'Configure payment modes.', 30),
      step('payment-terms', 'Configure payment terms.', 40),
      step('invoice-preferences', 'Configure invoice preferences.', 50),
      step('tax-applicability', 'Configure optional tax applicability.', 60),
      step('tax-jurisdictions', 'Configure optional tax jurisdictions.', 70),
      step('tax-authorities', 'Configure optional tax authorities.', 80),
      step('tax-rates', 'Configure optional tax rates.', 90),
    ],
  })
}

function crmResources(
  resources: Record<string, unknown>
): ProvisioningDraftReplace['resources'] {
  const priorities = Array.isArray(resources.request_priorities)
    ? resources.request_priorities
    : []
  const categories = Array.isArray(resources.request_categories)
    ? resources.request_categories
    : []
  const subcategories = Array.isArray(resources.request_subcategories)
    ? resources.request_subcategories
    : []

  let position = 10
  const rows: ProvisioningDraftReplace['resources'] = []
  const add = (
    resourceType: string,
    item: Record<string, unknown>,
    properties: ProvisioningDraftReplace['resources'][number]['properties']
  ) => {
    const key = String(item.key ?? '')
    rows.push({ resource_type: resourceType, key, position, properties })
    position += 10
  }

  for (const raw of priorities) {
    const item = raw as Record<string, unknown>
    add('request_priority', item, [
      stringProp('name', String(item.name ?? '')),
      ...optionalStringProp(
        'description',
        typeof item.description === 'string' ? item.description : null
      ),
      ...optionalStringProp(
        'color',
        typeof item.color === 'string' ? item.color : null
      ),
      ...optionalStringProp(
        'icon',
        typeof item.icon === 'string' ? item.icon : null
      ),
      integerProp('weight', Number(item.weight ?? 0)),
      integerProp('sortOrder', Number(item.sort_order ?? 0)),
      booleanProp('isDefault', Boolean(item.is_default)),
    ])
  }

  for (const raw of categories) {
    const item = raw as Record<string, unknown>
    add('request_category', item, [
      stringProp('name', String(item.name ?? '')),
      ...optionalStringProp(
        'description',
        typeof item.description === 'string' ? item.description : null
      ),
      ...optionalStringProp(
        'color',
        typeof item.color === 'string' ? item.color : null
      ),
      ...optionalStringProp(
        'icon',
        typeof item.icon === 'string' ? item.icon : null
      ),
      integerProp('sortOrder', Number(item.sort_order ?? 0)),
      booleanProp('isActive', item.is_active !== false),
      ...optionalReferenceProp(
        'defaultPriority',
        'request_priority',
        typeof item.default_priority === 'string' ? item.default_priority : null
      ),
    ])
  }

  for (const raw of subcategories) {
    const item = raw as Record<string, unknown>
    add('request_subcategory', item, [
      referenceProp('category', 'request_category', String(item.category ?? '')),
      stringProp('name', String(item.name ?? '')),
      ...optionalStringProp(
        'description',
        typeof item.description === 'string' ? item.description : null
      ),
      ...optionalStringProp(
        'icon',
        typeof item.icon === 'string' ? item.icon : null
      ),
      integerProp('sortOrder', Number(item.sort_order ?? 0)),
      booleanProp('isActive', item.is_active !== false),
      ...optionalReferenceProp(
        'defaultPriority',
        'request_priority',
        typeof item.default_priority === 'string' ? item.default_priority : null
      ),
    ])
  }

  return rows
}

export function buildApplicationImportDraft(
  manifest: ProvisioningImportApplicationManifest
): ProvisioningDraftReplace {
  const resources = Array.isArray(manifest.resources)
    ? (manifest.resources as ProvisioningDraftReplace['resources'])
    : manifest.app_slug === '876-crm'
      ? crmResources(manifest.resources)
      : []

  const steps = manifest.steps.map((value, index) =>
    typeof value === 'string'
      ? {
          key: value,
          description: `Provision ${value.replaceAll('-', ' ')}.`,
          position: (index + 1) * 10,
        }
      : value
  )

  return provisioningDraftReplaceSchema.parse({
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: manifest.finance_dependency,
    finance_scopes: manifest.finance_scopes,
    resources,
    steps,
  })
}

export function buildOrganizationImportDraft(
  spec: ProvisioningImportSpecification
): ProvisioningDraftReplace {
  return provisioningDraftReplaceSchema.parse({
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: spec.organization_manifest.finance_dependency,
    finance_scopes: spec.organization_manifest.finance_scopes,
    resources: Array.isArray(spec.organization_manifest.resources)
      ? spec.organization_manifest.resources
      : [],
    steps: spec.organization_manifest.steps.map((value, index) =>
      typeof value === 'string'
        ? {
            key: value,
            description: `Provision ${value.replaceAll('-', ' ')}.`,
            position: (index + 1) * 10,
          }
        : value
    ),
  })
}
