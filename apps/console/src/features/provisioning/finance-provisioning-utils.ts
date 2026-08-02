import type {
  AdminProvisioningCatalog,
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifestRevision,
  AdminProvisioningResource,
} from '@876/admin'

export type FinanceResourceDefinition =
  AdminProvisioningCatalog['resource_types'][number]

export type FinanceResourceRow = {
  localId: string
  resourceType: string
  key: string
  values: Record<string, string | boolean>
}

type DraftProperty = NonNullable<
  AdminProvisioningDraftReplaceParams['resources']
>[number]['properties'][number]

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

export function fieldDisplayValue(value: string | boolean | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '—'
}
