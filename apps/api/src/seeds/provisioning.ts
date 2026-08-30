import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  countSetups,
  createSetup,
  findAppBySlug,
  findPublished,
  findRevision,
  findSetupByKey,
  publishDraft,
  renameManifestTargetKey,
  replaceDraft,
} from './provisioning.repository'

const log = getLogger('seeds:provisioning')

export type ProvisioningSeedSummary = {
  manifestsProcessed: number
  manifestsPublished: number
  skipped: number
}

type PropertyDef = {
  key: string
  value_type: string
  string_value?: string | null
  integer_value?: number | null
  decimal_value?: string | null
  boolean_value?: boolean | null
  reference_namespace?: string | null
  reference_key?: string | null
}

type ResourceDef = {
  resource_type: string
  key: string
  position: number
  properties: PropertyDef[]
}

type StepDef = {
  key: string
  description: string
  position: number
}

function stringProp(key: string, value: string): PropertyDef {
  return { key, value_type: 'string', string_value: value }
}
function integerProp(key: string, value: number): PropertyDef {
  return { key, value_type: 'integer', integer_value: value }
}
function decimalProp(key: string, value: string): PropertyDef {
  return { key, value_type: 'decimal', decimal_value: value }
}
function booleanProp(key: string, value: boolean): PropertyDef {
  return { key, value_type: 'boolean', boolean_value: value }
}
function referenceProp(
  key: string,
  namespace: string,
  value: string
): PropertyDef {
  return {
    key,
    value_type: 'reference',
    reference_namespace: namespace,
    reference_key: value,
  }
}
function resourceDef(
  resourceType: string,
  key: string,
  position: number,
  properties: PropertyDef[]
): ResourceDef {
  return { resource_type: resourceType, key, position, properties }
}

export const DEFAULT_PROVISIONING_SETUP = {
  key: 'jamaica',
  name: 'Jamaica',
  description:
    'Jamaican dollar, Tax Administration Jamaica, and the standard GCT rate.',
  countryCode: 'JM',
  currencyCode: 'JMD',
} as const

export const FINANCE_BOOTSTRAP_RESOURCES: ResourceDef[] = [
  resourceDef('workspace', 'default', 0, [
    referenceProp('countryCode', 'country', 'JM'),
    referenceProp('baseCurrency', 'currency', 'JMD'),
    referenceProp('defaultCurrency', 'currency', 'JMD'),
    referenceProp('defaultLanguage', 'language', 'en'),
  ]),
  resourceDef('currency', 'JMD', 10, [
    stringProp('code', 'JMD'),
    stringProp('name', 'Jamaican Dollar'),
    stringProp('numericCode', '388'),
    integerProp('minorUnit', 2),
    stringProp('symbol', '$'),
  ]),
  resourceDef('payment_mode', 'cash', 20, [stringProp('name', 'Cash')]),
  resourceDef('payment_mode', 'credit-card', 30, [
    stringProp('name', 'Credit Card'),
  ]),
  resourceDef('payment_mode', 'bank-transfer', 40, [
    stringProp('name', 'Bank Transfer'),
  ]),
  resourceDef('payment_term', 'due-on-receipt', 50, [
    stringProp('name', 'Due on Receipt'),
    stringProp('rule', 'DUE_ON_RECEIPT'),
    integerProp('dueDays', 0),
  ]),
  resourceDef('payment_term', 'net-15', 60, [
    stringProp('name', 'Net 15'),
    stringProp('rule', 'NET_DAYS'),
    integerProp('dueDays', 15),
  ]),
  resourceDef('payment_term', 'net-30', 70, [
    stringProp('name', 'Net 30'),
    stringProp('rule', 'NET_DAYS'),
    integerProp('dueDays', 30),
  ]),
  resourceDef('payment_term', 'net-45', 80, [
    stringProp('name', 'Net 45'),
    stringProp('rule', 'NET_DAYS'),
    integerProp('dueDays', 45),
  ]),
  resourceDef('payment_term', 'net-60', 90, [
    stringProp('name', 'Net 60'),
    stringProp('rule', 'NET_DAYS'),
    integerProp('dueDays', 60),
  ]),
  resourceDef('invoice_preference', 'default', 100, [
    stringProp('defaultTaxBehavior', 'EXCLUSIVE'),
    booleanProp('lateFeesEnabled', false),
    stringProp('lateFeeCalculationType', 'PERCENTAGE'),
    integerProp('lateFeeGraceDays', 0),
    booleanProp('lateFeeGenerateAsDraft', true),
  ]),
  resourceDef('tax_authority', 'taj', 110, [
    stringProp('name', 'Tax Administration Jamaica'),
    stringProp('description', "Jamaica's national tax administration."),
    referenceProp('countryCode', 'country', 'JM'),
  ]),
  resourceDef('tax_rate', 'gct-standard', 120, [
    stringProp('name', 'Standard GCT'),
    stringProp('description', 'Jamaica standard General Consumption Tax rate.'),
    stringProp('taxType', 'GCT'),
    decimalProp('rate', '15.00000000'),
    booleanProp('inclusive', false),
    referenceProp('authority', 'tax_authority', 'taj'),
  ]),
]

export const FINANCE_BOOTSTRAP_STEPS: StepDef[] = [
  { key: 'workspace', description: 'Create the finance workspace.', position: 0 },
  { key: 'currencies', description: 'Create configured currencies.', position: 10 },
  { key: 'payment-modes', description: 'Create payment modes.', position: 20 },
  { key: 'payment-terms', description: 'Create payment terms.', position: 30 },
  { key: 'invoice-preferences', description: 'Create invoice preferences.', position: 40 },
  { key: 'tax-authorities', description: 'Create tax authorities.', position: 50 },
  { key: 'tax-rates', description: 'Create tax rates.', position: 60 },
]

const CRM_BOOTSTRAP_RESOURCES: ResourceDef[] = [
  resourceDef('request_priority', 'low', 10, [
    stringProp('name', 'Low'),
    stringProp('color', 'blue'),
    integerProp('weight', 10),
    integerProp('sortOrder', 10),
    booleanProp('isDefault', false),
  ]),
  resourceDef('request_priority', 'normal', 20, [
    stringProp('name', 'Normal'),
    stringProp('color', 'slate'),
    integerProp('weight', 20),
    integerProp('sortOrder', 20),
    booleanProp('isDefault', true),
  ]),
  resourceDef('request_priority', 'high', 30, [
    stringProp('name', 'High'),
    stringProp('color', 'amber'),
    integerProp('weight', 30),
    integerProp('sortOrder', 30),
    booleanProp('isDefault', false),
  ]),
  resourceDef('request_priority', 'urgent', 40, [
    stringProp('name', 'Urgent'),
    stringProp('color', 'red'),
    integerProp('weight', 40),
    integerProp('sortOrder', 40),
    booleanProp('isDefault', false),
  ]),
  ...[
    ['general', 'General', 0],
    ['support', 'Support', 1],
    ['billing', 'Billing', 2],
    ['sales', 'Sales', 3],
    ['complaint', 'Complaint', 4],
    ['feedback', 'Feedback', 5],
    ['other', 'Other', 6],
  ].map(([key, name, sortOrder]) =>
    resourceDef('request_category', String(key), 100 + Number(sortOrder) * 10, [
      stringProp('name', String(name)),
      integerProp('sortOrder', Number(sortOrder)),
      booleanProp('isActive', true),
    ])
  ),
  // request_subcategory is intentionally supported by the catalog but the
  // default CRM manifest contains none. Operators can add them in later revisions.
]

const CRM_BOOTSTRAP_STEPS: StepDef[] = [
  { key: 'request-priorities', description: 'Create CRM request priorities.', position: 10 },
  { key: 'request-categories', description: 'Create CRM request categories.', position: 20 },
  { key: 'request-subcategories', description: 'Create configured CRM request subcategories.', position: 30 },
]

type PlatformAppProvisioningDef = {
  slug: string
  financeDependency: 'none' | 'embedded'
  financeScopes: string[]
  resources?: ResourceDef[]
  steps?: StepDef[]
}

const PLATFORM_APPS_FOR_PROVISIONING: PlatformAppProvisioningDef[] = [
  { slug: '876-consumer', financeDependency: 'none', financeScopes: [] },
  { slug: '876-enterprise', financeDependency: 'none', financeScopes: [] },
  { slug: 'console', financeDependency: 'none', financeScopes: [] },
  {
    slug: '876-couriers',
    financeDependency: 'embedded',
    financeScopes: [
      'billing.customers.read',
      'billing.customers.write',
      'billing.items.read',
      'billing.items.write',
      'billing.invoices.read',
      'billing.invoices.write',
      'billing.payments.read',
      'billing.payments.write',
    ],
  },
  { slug: '876-billing', financeDependency: 'none', financeScopes: [] },
  {
    slug: '876-invoice',
    financeDependency: 'embedded',
    financeScopes: [
      'billing.customers.read',
      'billing.customers.write',
      'billing.items.read',
      'billing.items.write',
      'billing.invoices.read',
      'billing.invoices.write',
      'billing.payments.read',
      'billing.payments.write',
    ],
  },
  {
    slug: '876-crm',
    financeDependency: 'embedded',
    financeScopes: ['billing.customers.read', 'billing.customers.write'],
    resources: CRM_BOOTSTRAP_RESOURCES,
    steps: CRM_BOOTSTRAP_STEPS,
  },
]

function revisionContent(revision: {
  reconciliation: string
  preserveTenantOverrides: boolean
  financeDependency: string
  financeScopes: string[]
  resources: Array<{
    resourceType: string
    key: string
    position: number
    properties: Array<{
      key: string
      valueType: string
      stringValue: string | null
      integerValue: bigint | null
      decimalValue: unknown
      booleanValue: boolean | null
      referenceNamespace: string | null
      referenceKey: string | null
    }>
  }>
  steps: Array<{ key: string; description: string; position: number }>
}): string {
  const resources = revision.resources
    .map((resource) => ({
      resourceType: resource.resourceType,
      key: resource.key,
      position: resource.position,
      properties: resource.properties
        .map((property) => ({
          key: property.key,
          valueType: property.valueType,
          stringValue: property.stringValue,
          integerValue: property.integerValue?.toString() ?? null,
          decimalValue: property.decimalValue ? String(property.decimalValue) : null,
          booleanValue: property.booleanValue,
          referenceNamespace: property.referenceNamespace,
          referenceKey: property.referenceKey,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => a.position - b.position)
  const steps = [...revision.steps].sort((a, b) => a.position - b.position)

  return JSON.stringify({
    reconciliation: revision.reconciliation,
    preserveTenantOverrides: revision.preserveTenantOverrides,
    financeDependency: revision.financeDependency,
    financeScopes: [...revision.financeScopes].sort(),
    resources,
    steps,
  })
}

async function hasUnpublishedChanges(
  targetType: string,
  targetKey: string,
  published: Awaited<ReturnType<typeof findPublished>>
): Promise<boolean> {
  const draftRevision = await findRevision(targetType, targetKey, 'draft')
  if (!draftRevision) return false
  if (!published) return true
  if (
    revisionContent(draftRevision) ===
    revisionContent(published as unknown as typeof draftRevision)
  )
    return false

  log.warn(
    {
      target_type: targetType,
      target_key: targetKey,
      draft_revision: draftRevision.revision,
      published_revision: published.revision,
    },
    'provisioning.seed.draft_preserved'
  )
  return true
}

async function seedStaticTarget(params: {
  targetType: string
  targetKey: string
  resources: ResourceDef[]
  steps: StepDef[]
}): Promise<boolean> {
  const published = await findPublished(params.targetType, params.targetKey)
  if (published) return false
  if (await hasUnpublishedChanges(params.targetType, params.targetKey, published))
    return false

  const now = BigInt(nowUnixSeconds())
  await replaceDraft({
    targetType: params.targetType,
    targetKey: params.targetKey,
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    financeDependency: 'none',
    financeScopes: [],
    resources: params.resources.map((resource) => ({
      resourceType: resource.resource_type,
      key: resource.key,
      position: resource.position,
      properties: resource.properties.map((property) => ({
        key: property.key,
        valueType: property.value_type,
        stringValue: property.string_value ?? null,
        integerValue:
          property.integer_value !== null && property.integer_value !== undefined
            ? BigInt(property.integer_value)
            : null,
        decimalValue: property.decimal_value ?? null,
        booleanValue: property.boolean_value ?? null,
        referenceNamespace: property.reference_namespace ?? null,
        referenceKey: property.reference_key ?? null,
      })),
    })),
    steps: params.steps,
    now,
  })
  await publishDraft(params.targetType, params.targetKey, now)
  return true
}

async function seedDefaultSetup(): Promise<void> {
  const now = BigInt(nowUnixSeconds())
  const existing = await findSetupByKey(DEFAULT_PROVISIONING_SETUP.key)
  if (!existing) {
    const isFirst = (await countSetups()) === 0
    await createSetup({
      id: generateId('provisioningSetup'),
      key: DEFAULT_PROVISIONING_SETUP.key,
      name: DEFAULT_PROVISIONING_SETUP.name,
      description: DEFAULT_PROVISIONING_SETUP.description,
      countryCode: DEFAULT_PROVISIONING_SETUP.countryCode,
      currencyCode: DEFAULT_PROVISIONING_SETUP.currencyCode,
      isDefault: isFirst,
      now,
    })
    log.info(
      { setup_key: DEFAULT_PROVISIONING_SETUP.key, is_default: isFirst },
      'provisioning.seed.setup_created'
    )
  }

  const renamed = await renameManifestTargetKey(
    'finance',
    'shared',
    DEFAULT_PROVISIONING_SETUP.key,
    now
  )
  if (renamed)
    log.info(
      { setup_key: DEFAULT_PROVISIONING_SETUP.key },
      'provisioning.seed.finance_manifest_rekeyed'
    )
}

function resourceKey(resource: ResourceDef) {
  return `${resource.resource_type}:${resource.key}`
}

async function seedApplication(
  definition: PlatformAppProvisioningDef
): Promise<boolean> {
  const app = await findAppBySlug(definition.slug)
  if (!app) {
    log.error({ app_slug: definition.slug }, 'provisioning.seed.app_missing')
    return false
  }

  const published = await findPublished('application', app.id)
  const desiredScopes = [...new Set(definition.financeScopes)].sort()
  if (await hasUnpublishedChanges('application', app.id, published))
    return false

  let resources: ResourceDef[] = []
  let steps: StepDef[] = []
  if (published) {
    const full = await findRevision('application', app.id, 'published')
    if (full) {
      resources = full.resources.map((resource) => ({
        resource_type: resource.resourceType,
        key: resource.key,
        position: resource.position,
        properties: resource.properties.map((property) => ({
          key: property.key,
          value_type: property.valueType,
          string_value: property.stringValue,
          integer_value: property.integerValue ? Number(property.integerValue) : null,
          decimal_value: property.decimalValue ? String(property.decimalValue) : null,
          boolean_value: property.booleanValue,
          reference_namespace: property.referenceNamespace,
          reference_key: property.referenceKey,
        })),
      }))
      steps = full.steps.map((step) => ({
        key: step.key,
        description: step.description,
        position: step.position,
      }))
    }
  }

  const existingResources = new Set(resources.map(resourceKey))
  const missingResources = (definition.resources ?? []).filter(
    (resource) => !existingResources.has(resourceKey(resource))
  )
  const existingSteps = new Set(steps.map((step) => step.key))
  const missingSteps = (definition.steps ?? []).filter(
    (step) => !existingSteps.has(step.key)
  )
  const financeMatches =
    published &&
    published.financeDependency === definition.financeDependency &&
    [...published.financeScopes].sort().join(',') === desiredScopes.join(',')

  if (published && financeMatches && missingResources.length === 0 && missingSteps.length === 0)
    return false

  resources = [...resources, ...missingResources]
  steps = [...steps, ...missingSteps]

  const now = BigInt(nowUnixSeconds())
  await replaceDraft({
    targetType: 'application',
    targetKey: app.id,
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    financeDependency: definition.financeDependency,
    financeScopes: desiredScopes,
    resources: resources.map((resource) => ({
      resourceType: resource.resource_type,
      key: resource.key,
      position: resource.position,
      properties: resource.properties.map((property) => ({
        key: property.key,
        valueType: property.value_type,
        stringValue: property.string_value ?? null,
        integerValue:
          property.integer_value !== null && property.integer_value !== undefined
            ? BigInt(property.integer_value)
            : null,
        decimalValue: property.decimal_value ?? null,
        booleanValue: property.boolean_value ?? null,
        referenceNamespace: property.reference_namespace ?? null,
        referenceKey: property.reference_key ?? null,
      })),
    })),
    steps,
    now,
  })
  await publishDraft('application', app.id, now)
  log.info(
    {
      app_id: app.id,
      app_slug: definition.slug,
      finance_dependency: definition.financeDependency,
      resources_added: missingResources.length,
      steps_added: missingSteps.length,
    },
    'provisioning.seed.application_published'
  )
  return true
}

export async function seedFirstPartyProvisioningManifests(): Promise<ProvisioningSeedSummary> {
  let published = 0
  let skipped = 0

  const orgResult = await seedStaticTarget({
    targetType: 'organization',
    targetKey: 'global',
    resources: [],
    steps: [],
  })
  if (orgResult) published += 1
  else skipped += 1

  await seedDefaultSetup()

  const financeResult = await seedStaticTarget({
    targetType: 'finance',
    targetKey: DEFAULT_PROVISIONING_SETUP.key,
    resources: FINANCE_BOOTSTRAP_RESOURCES,
    steps: FINANCE_BOOTSTRAP_STEPS,
  })
  if (financeResult) published += 1
  else skipped += 1

  for (const definition of PLATFORM_APPS_FOR_PROVISIONING) {
    const result = await seedApplication(definition)
    if (result) published += 1
    else skipped += 1
  }

  return {
    manifestsProcessed: PLATFORM_APPS_FOR_PROVISIONING.length + 2,
    manifestsPublished: published,
    skipped,
  }
}
