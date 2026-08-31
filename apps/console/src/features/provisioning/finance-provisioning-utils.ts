import type {
  AdminProvisioningCatalog,
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifestRevision,
  AdminProvisioningResource,
} from '@876/platform/compat'
import type { IconComponent } from '@876/ui/icons'
import {
  Building2,
  Calendar,
  CreditCard,
  Database,
  DocumentTextIcon,
  Globe,
  ReceiptPercent,
  ReceiptText,
  ShieldCheck,
  TableIcon,
} from '@876/ui/icons'

export type FinanceResourceDefinition =
  AdminProvisioningCatalog['resource_types'][number]

export type FinanceProvisioningTab = {
  key: string
  label: string
  multiple: boolean
}

export const FINANCE_PROVISIONING_TABS: readonly FinanceProvisioningTab[] = [
  { key: 'workspace', label: 'Workspace', multiple: false },
  { key: 'currency', label: 'Currencies', multiple: true },
  { key: 'payment_mode', label: 'Payment modes', multiple: true },
  { key: 'payment_term', label: 'Payment terms', multiple: true },
  { key: 'invoice_preference', label: 'Invoice preferences', multiple: false },
  { key: 'tax_authority', label: 'Tax authorities', multiple: true },
  { key: 'tax_rate', label: 'Tax rates', multiple: true },
] as const

export type FinanceResourceRow = {
  localId: string
  resourceType: string
  key: string
  values: Record<string, string | boolean>
}

type DraftProperty = NonNullable<
  AdminProvisioningDraftReplaceParams['resources']
>[number]['properties'][number]

export const RESOURCE_TYPE_ICONS: Record<string, IconComponent> = {
  workspace: Globe,
  currency: Database,
  payment_mode: CreditCard,
  payment_term: Calendar,
  invoice_preference: ReceiptText,
  tax_authority: ShieldCheck,
  tax_rate: ReceiptPercent,
  document_preference: DocumentTextIcon,
  organization_profile: Building2,
}

export function getResourceTypeIcon(resourceType: string): IconComponent {
  return RESOURCE_TYPE_ICONS[resourceType] ?? TableIcon
}

export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  workspace: 'text-sky-500 dark:text-sky-400',
  currency: 'text-amber-500 dark:text-amber-400',
  payment_mode: 'text-indigo-500 dark:text-indigo-400',
  payment_term: 'text-emerald-500 dark:text-emerald-400',
  invoice_preference: 'text-rose-500 dark:text-rose-400',
  tax_authority: 'text-teal-500 dark:text-teal-400',
  tax_rate: 'text-violet-500 dark:text-violet-400',
  document_preference: 'text-blue-500 dark:text-blue-400',
  organization_profile: 'text-purple-500 dark:text-purple-400',
}

export function getResourceTypeColor(resourceType: string): string {
  return (
    RESOURCE_TYPE_COLORS[resourceType] ?? 'text-blue-600 dark:text-blue-400'
  )
}

function propertyValue(
  property: AdminProvisioningResource['properties'][number]
): string | boolean {
  if (property.value_type === 'boolean') return property.boolean_value ?? false
  if (property.value_type === 'integer') return property.integer_value ?? ''
  if (property.value_type === 'decimal') return property.decimal_value ?? ''
  if (property.value_type === 'reference') return property.reference_key ?? ''
  return property.string_value ?? ''
}

export function revisionRows(
  revision: AdminProvisioningManifestRevision | null
): FinanceResourceRow[] {
  if (!revision) return []
  return revision.resources.map((resource) => ({
    localId: resource.id,
    resourceType: resource.resource_type,
    key: resource.key,
    values: Object.fromEntries(
      resource.properties.map((property) => [
        property.key,
        propertyValue(property),
      ])
    ),
  }))
}

export function emptyRow(
  definition: FinanceResourceDefinition,
  localId: string
): FinanceResourceRow {
  return {
    localId,
    resourceType: definition.resource_type,
    key: '',
    values: Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        field.value_type === 'boolean'
          ? false
          : (field.allowed_values?.[0] ?? ''),
      ])
    ),
  }
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function rowReferenceKey(row: FinanceResourceRow) {
  if (row.key.trim()) return row.key.trim()
  const preferred =
    (typeof row.values.code === 'string' ? row.values.code.trim() : '') ||
    (typeof row.values.name === 'string' ? row.values.name.trim() : '') ||
    (typeof row.values.documentType === 'string'
      ? row.values.documentType.trim()
      : '')
  return typeof preferred === 'string' ? slug(preferred) : ''
}

function resourceKey(
  row: FinanceResourceRow,
  definition: FinanceResourceDefinition,
  index: number
) {
  if (!definition.multiple) return 'default'
  return rowReferenceKey(row) || `${definition.resource_type}_${index + 1}`
}

export function buildFinanceDraft(
  catalog: AdminProvisioningCatalog,
  rows: FinanceResourceRow[],
  current: AdminProvisioningManifestRevision | null
): AdminProvisioningDraftReplaceParams {
  let position = 10
  const resources = catalog.resource_types.flatMap((definition) =>
    rows
      .filter((row) => row.resourceType === definition.resource_type)
      .map((row, index) => {
        const resourcePosition = position
        position += 10
        return {
          resource_type: definition.resource_type,
          key: resourceKey(row, definition, index),
          position: resourcePosition,
          properties: definition.fields.flatMap<DraftProperty>((field) => {
            const value = row.values[field.key]
            if (value === '' || value === undefined) return []
            const property = { key: field.key, value_type: field.value_type }
            if (field.value_type === 'boolean')
              return [{ ...property, boolean_value: value === true }]
            if (field.value_type === 'integer')
              return [{ ...property, integer_value: String(value) }]
            if (field.value_type === 'decimal')
              return [{ ...property, decimal_value: String(value) }]
            if (field.value_type === 'reference')
              return [
                {
                  ...property,
                  reference_namespace: field.reference_namespace,
                  reference_key: String(value),
                },
              ]
            return [{ ...property, string_value: String(value) }]
          }),
        }
      })
  )

  return {
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: current?.finance_dependency ?? 'none',
    finance_scopes: current?.finance_scopes ?? [],
    resources,
    steps:
      current?.steps.map((step) => ({
        key: step.key,
        description: step.description,
        position: step.position,
      })) ?? [],
  }
}

const SMALL_WORDS = new Set([
  'of',
  'on',
  'in',
  'and',
  'the',
  'for',
  'to',
  'a',
  'an',
])

export function formatOptionLabel(value: string): string {
  if (!value) return value
  const words = value.split(/[_\s]+/)
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && SMALL_WORDS.has(lower)) {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function fieldDisplayValue(value: string | boolean | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '—'
}
