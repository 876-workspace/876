import { BILLING_APP_SLUG } from './provisioning'

// Provisioning catalog — the closed set of resource types each provisioning
// target may declare, and the validation that keeps a draft consistent.
//
// Mirrors `services/provisioning_catalog.py` exactly so the same manifests
// pass or fail on either side of the migration.

export type ProvisioningTargetType = 'organization' | 'finance' | 'application'
export type ProvisioningValueType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'reference'
export type FinanceDependency = 'none' | 'embedded'

export type ProvisioningFieldDefinition = {
  key: string
  label: string
  valueType: ProvisioningValueType
  required: boolean
  referenceNamespace: string | null
  allowedValues: string[] | null
}

export type ProvisioningResourceDefinition = {
  resourceType: string
  label: string
  description: string
  multiple: boolean
  minimumItems: number
  maximumItems: number | null
  fields: ProvisioningFieldDefinition[]
}

export type ProvisioningValidationIssue = {
  path: string
  code: string
  message: string
}

export type ProvisioningPropertyInput = {
  key: string
  valueType: ProvisioningValueType
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

export type ProvisioningResourceInput = {
  resourceType: string
  key: string
  position: number
  properties: ProvisioningPropertyInput[]
}

export type ProvisioningDraftReplace = {
  manifestVersion?: 1
  reconciliation?: 'create_missing'
  preserveTenantOverrides?: true
  financeDependency: FinanceDependency
  financeScopes?: string[]
  resources: ProvisioningResourceInput[]
  steps?: unknown[]
}

// ---------------------------------------------------------------------------
// Internal registry types — kept private so callers only see the serialised
// definitions, the same way the Python dataclasses are module-private.
// ---------------------------------------------------------------------------

type Field = {
  label: string
  valueType: ProvisioningValueType
  required: boolean
  referenceNamespace: string | null
  allowedValues: readonly string[] | null
  unique: boolean
}

type Resource = {
  label: string
  description: string
  multiple: boolean
  minimumItems: number
  fields: Record<string, Field>
}

function field(
  label: string,
  valueType: ProvisioningValueType,
  opts: Partial<Omit<Field, 'label' | 'valueType'>> = {}
): Field {
  return {
    label,
    valueType,
    required: opts.required ?? true,
    referenceNamespace: opts.referenceNamespace ?? null,
    allowedValues: opts.allowedValues ?? null,
    unique: opts.unique ?? false,
  }
}

function resource(
  label: string,
  description: string,
  multiple: boolean,
  minimumItems: number,
  fields: Record<string, Field>
): Resource {
  return { label, description, multiple, minimumItems, fields }
}

export const FINANCE_RESOURCES: Record<string, Resource> = {
  currency: resource(
    'Currencies',
    'Currencies created for every new finance workspace.',
    true,
    1,
    {
      code: field('ISO code', 'string'),
      name: field('Name', 'string'),
      numericCode: field('Numeric code', 'string', { required: false }),
      minorUnit: field('Minor unit', 'integer'),
      symbol: field('Symbol', 'string', { required: false }),
    }
  ),
  workspace: resource(
    'Workspace defaults',
    'Locale and currency defaults for a finance workspace.',
    false,
    1,
    {
      countryCode: field('Country', 'reference', {
        referenceNamespace: 'country',
      }),
      baseCurrency: field('Base currency', 'reference', {
        referenceNamespace: 'currency',
      }),
      defaultCurrency: field('Default currency', 'reference', {
        referenceNamespace: 'currency',
      }),
      defaultLanguage: field('Default language', 'reference', {
        referenceNamespace: 'language',
      }),
    }
  ),
  payment_mode: resource(
    'Payment modes',
    'Payment methods available on new workspaces.',
    true,
    1,
    {
      name: field('Name', 'string'),
    }
  ),
  payment_term: resource(
    'Payment terms',
    'Reusable due-date rules for invoices and estimates.',
    true,
    1,
    {
      name: field('Name', 'string'),
      rule: field('Rule', 'string', {
        allowedValues: [
          'DUE_ON_RECEIPT',
          'NET_DAYS',
          'END_OF_MONTH',
          'END_OF_NEXT_MONTH',
        ],
      }),
      dueDays: field('Due days', 'integer'),
    }
  ),
  invoice_preference: resource(
    'Invoice preferences',
    'Default invoice behavior; tenant edits remain authoritative.',
    false,
    1,
    {
      defaultTaxBehavior: field('Tax behavior', 'string', {
        allowedValues: ['EXCLUSIVE', 'INCLUSIVE'],
      }),
      lateFeesEnabled: field('Late fees enabled', 'boolean'),
      lateFeeCalculationType: field('Late fee calculation', 'string', {
        allowedValues: ['PERCENTAGE', 'FIXED'],
      }),
      lateFeePercent: field('Late fee percent', 'decimal', { required: false }),
      lateFeeAmount: field('Late fee amount', 'integer', { required: false }),
      lateFeeGraceDays: field('Grace days', 'integer'),
      lateFeeGenerateAsDraft: field('Generate as draft', 'boolean'),
    }
  ),
  tax_authority: resource(
    'Tax authorities',
    'Tax administrations available to newly created organizations.',
    true,
    1,
    {
      name: field('Name', 'string'),
      description: field('Description', 'string', { required: false }),
      countryCode: field('Country', 'reference', {
        referenceNamespace: 'country',
      }),
    }
  ),
  tax_rate: resource(
    'Tax rates',
    'Tax rates created for newly provisioned finance workspaces.',
    true,
    1,
    {
      name: field('Name', 'string'),
      description: field('Description', 'string', { required: false }),
      taxType: field('Tax type', 'string', { required: false }),
      rate: field('Rate', 'decimal'),
      inclusive: field('Inclusive', 'boolean'),
      authority: field('Tax authority', 'reference', {
        referenceNamespace: 'tax_authority',
      }),
    }
  ),
}

export const ORGANIZATION_RESOURCES: Record<string, Resource> = {
  organization_profile: resource(
    'Organization profile',
    'Defaults for the global organization record.',
    false,
    0,
    {
      countryCode: field('Country', 'reference', {
        referenceNamespace: 'country',
      }),
      language: field('Language', 'string'),
      timezone: field('Timezone', 'string'),
    }
  ),
}

export const APPLICATION_RESOURCES: Record<string, Record<string, Resource>> = {
  [BILLING_APP_SLUG]: {
    document_preference: resource(
      'Document preferences',
      'Default customer note and terms per document type. Subscription-generated invoices inherit the invoice preference.',
      true,
      0,
      {
        documentType: field('Document type', 'string', {
          allowedValues: ['invoice', 'quote', 'estimate', 'credit_note'],
          unique: true,
        }),
        customerNote: field('Customer note', 'string', { required: false }),
        termsAndConditions: field('Terms and conditions', 'string', {
          required: false,
        }),
      }
    ),
  },
}

export function resourceRegistry(
  targetType: ProvisioningTargetType,
  targetKey: string
): Record<string, Resource> {
  if (targetType === 'finance') return FINANCE_RESOURCES
  if (targetType === 'organization') return ORGANIZATION_RESOURCES
  return APPLICATION_RESOURCES[targetKey] ?? {}
}

export function catalogDefinitions(
  targetType: ProvisioningTargetType,
  targetKey: string
): ProvisioningResourceDefinition[] {
  const registry = resourceRegistry(targetType, targetKey)
  const definitions: ProvisioningResourceDefinition[] = []

  for (const [resourceType, resourceDef] of Object.entries(registry)) {
    definitions.push({
      resourceType,
      label: resourceDef.label,
      description: resourceDef.description,
      multiple: resourceDef.multiple,
      minimumItems: resourceDef.minimumItems,
      maximumItems: resourceDef.multiple ? null : 1,
      fields: Object.entries(resourceDef.fields).map(([key, fieldDef]) => ({
        key,
        label: fieldDef.label,
        valueType: fieldDef.valueType,
        required: fieldDef.required,
        referenceNamespace: fieldDef.referenceNamespace,
        allowedValues: fieldDef.allowedValues
          ? [...fieldDef.allowedValues]
          : null,
      })),
    })
  }

  return definitions
}

export function validateDraft(
  targetType: ProvisioningTargetType,
  targetKey: string,
  draft: ProvisioningDraftReplace
): ProvisioningValidationIssue[] {
  const issues: ProvisioningValidationIssue[] = []

  if (targetType !== 'application' && draft.financeDependency !== 'none') {
    issues.push({
      path: 'finance_dependency',
      code: 'invalid_target_contract',
      message:
        'Only application manifests may declare an embedded finance dependency.',
    })
  }

  const registry = resourceRegistry(targetType, targetKey)
  const counts: Record<string, number> = {}

  draft.resources.forEach((resource, index) => {
    const path = `resources.${index}`
    const definition = registry[resource.resourceType]

    if (!definition) {
      issues.push({
        path: `${path}.resource_type`,
        code: 'unknown_resource_type',
        message: `Resource type '${resource.resourceType}' is not registered for this target.`,
      })
      return
    }

    counts[resource.resourceType] = (counts[resource.resourceType] ?? 0) + 1

    const values = new Map(resource.properties.map((p) => [p.key, p]))

    for (const [key, fieldDef] of Object.entries(definition.fields)) {
      const prop = values.get(key)

      if (!prop) {
        if (fieldDef.required) {
          issues.push({
            path: `${path}.properties.${key}`,
            code: 'missing_property',
            message: `Property '${key}' is required.`,
          })
        }
        continue
      }

      if (prop.valueType !== fieldDef.valueType) {
        issues.push({
          path: `${path}.properties.${key}.value_type`,
          code: 'invalid_property_type',
          message: `Property '${key}' must use value type '${fieldDef.valueType}'.`,
        })
      }

      if (
        fieldDef.referenceNamespace &&
        prop.referenceNamespace !== fieldDef.referenceNamespace
      ) {
        issues.push({
          path: `${path}.properties.${key}.reference_namespace`,
          code: 'invalid_reference_namespace',
          message: `Property '${key}' must reference '${fieldDef.referenceNamespace}'.`,
        })
      }

      const scalar = prop.stringValue
      if (
        fieldDef.allowedValues &&
        !fieldDef.allowedValues.includes(scalar as string)
      ) {
        issues.push({
          path: `${path}.properties.${key}`,
          code: 'invalid_property_value',
          message: `Property '${key}' must be one of: ${fieldDef.allowedValues.join(', ')}.`,
        })
      }
    }

    for (const key of values.keys()) {
      if (!(key in definition.fields)) {
        issues.push({
          path: `${path}.properties.${key}`,
          code: 'unknown_property',
          message: `Property '${key}' is not registered for resource type '${resource.resourceType}'.`,
        })
      }
    }
  })

  for (const [resourceType, count] of Object.entries(counts)) {
    if (count > 1 && !registry[resourceType]!.multiple) {
      issues.push({
        path: 'resources',
        code: 'resource_cardinality',
        message: `Resource type '${resourceType}' permits only one row.`,
      })
    }
  }

  for (const [resourceType, definition] of Object.entries(registry)) {
    const count = counts[resourceType] ?? 0
    if (count < definition.minimumItems) {
      issues.push({
        path: 'resources',
        code: 'resource_minimum',
        message: `Resource type '${resourceType}' requires at least ${definition.minimumItems} row(s).`,
      })
    }
  }

  const referenceNamespaces = new Set<string>()
  for (const definition of Object.values(registry)) {
    for (const fieldDef of Object.values(definition.fields)) {
      if (
        fieldDef.referenceNamespace &&
        fieldDef.referenceNamespace in registry
      ) {
        referenceNamespaces.add(fieldDef.referenceNamespace)
      }
    }
  }

  const referenceTargets: Record<string, Set<string>> = {}
  for (const ns of referenceNamespaces) {
    referenceTargets[ns] = new Set(
      draft.resources.filter((r) => r.resourceType === ns).map((r) => r.key)
    )
  }

  draft.resources.forEach((resource, index) => {
    for (const prop of resource.properties) {
      const ns = prop.referenceNamespace
      if (ns && ns in referenceTargets) {
        const targets = referenceTargets[ns]!
        // Python checks `property_.reference_key not in reference_targets[namespace]`
        // — a None/null key is never in the set, so it flags unresolved.
        if (!targets.has(prop.referenceKey as string)) {
          issues.push({
            path: `resources.${index}.properties.${prop.key}`,
            code: 'unresolved_reference',
            message: `Reference '${ns}/${prop.referenceKey}' does not exist in this draft.`,
          })
        }
      }
    }
  })

  for (const [resourceType, definition] of Object.entries(registry)) {
    for (const [fieldKey, fieldDef] of Object.entries(definition.fields)) {
      if (!fieldDef.unique) continue

      const seen = new Set<string>()

      draft.resources.forEach((resource, index) => {
        if (resource.resourceType !== resourceType) return

        const prop = resource.properties.find((p) => p.key === fieldKey)
        if (!prop) return

        // Tuple mirroring Python: (value_type, string_value, integer_value,
        // decimal_value, boolean_value, reference_namespace, reference_key)
        const tuple = JSON.stringify([
          prop.valueType,
          prop.stringValue,
          prop.integerValue,
          prop.decimalValue,
          prop.booleanValue,
          prop.referenceNamespace,
          prop.referenceKey,
        ])

        if (seen.has(tuple)) {
          issues.push({
            path: `resources.${index}.properties.${fieldKey}`,
            code: 'duplicate_unique_property',
            message: `Property '${fieldKey}' must be unique within resource type '${resourceType}'.`,
          })
        } else {
          seen.add(tuple)
        }
      })
    }
  }

  return issues
}
