import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  ALL_REGIONAL_PROVISIONING_PRESETS,
  type RegionalProvisioningPreset,
} from './data/provisioning-regional-defaults'
import {
  createRegionalSetup,
  findRegionalSetupByKey,
  seedRegionalSetupPolicy,
  setRegionalFallbackDefault,
} from './provisioning-regional.repository'
import {
  findPublished,
  findRevision,
  publishDraft,
  replaceDraft,
} from './provisioning.repository'

const log = getLogger('seeds:provisioning-regional')

type PropertyDef = {
  key: string
  valueType: 'string' | 'integer' | 'decimal' | 'boolean' | 'reference'
  stringValue: string | null
  integerValue: bigint | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

type ResourceDef = {
  resourceType: string
  key: string
  position: number
  properties: PropertyDef[]
}

function stringProp(key: string, value: string): PropertyDef {
  return {
    key,
    valueType: 'string',
    stringValue: value,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }
}

function integerProp(key: string, value: number): PropertyDef {
  return {
    key,
    valueType: 'integer',
    stringValue: null,
    integerValue: BigInt(value),
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }
}

function booleanProp(key: string, value: boolean): PropertyDef {
  return {
    key,
    valueType: 'boolean',
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: value,
    referenceNamespace: null,
    referenceKey: null,
  }
}

function referenceProp(
  key: string,
  namespace: string,
  value: string
): PropertyDef {
  return {
    key,
    valueType: 'reference',
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: namespace,
    referenceKey: value,
  }
}

function resourcesForPreset(preset: RegionalProvisioningPreset): ResourceDef[] {
  const workspaceProperties: PropertyDef[] = []
  if (preset.countryCode) {
    workspaceProperties.push(
      referenceProp('countryCode', 'country', preset.countryCode)
    )
  }
  workspaceProperties.push(
    referenceProp('baseCurrency', 'currency', preset.currency.code),
    referenceProp('defaultCurrency', 'currency', preset.currency.code),
    referenceProp('defaultLanguage', 'language', preset.defaultLanguage)
  )

  return [
    {
      resourceType: 'workspace',
      key: 'default',
      position: 0,
      properties: workspaceProperties,
    },
    {
      resourceType: 'currency',
      key: preset.currency.code,
      position: 10,
      properties: [
        stringProp('code', preset.currency.code),
        stringProp('name', preset.currency.name),
        integerProp('minorUnit', preset.currency.minorUnit),
      ],
    },
    {
      resourceType: 'payment_mode',
      key: 'cash',
      position: 20,
      properties: [stringProp('name', 'Cash')],
    },
    {
      resourceType: 'payment_mode',
      key: 'credit-card',
      position: 30,
      properties: [stringProp('name', 'Credit Card')],
    },
    {
      resourceType: 'payment_mode',
      key: 'bank-transfer',
      position: 40,
      properties: [stringProp('name', 'Bank Transfer')],
    },
    {
      resourceType: 'payment_term',
      key: 'due-on-receipt',
      position: 50,
      properties: [
        stringProp('name', 'Due on Receipt'),
        stringProp('rule', 'DUE_ON_RECEIPT'),
        integerProp('dueDays', 0),
      ],
    },
    ...[15, 30, 45, 60].map((days, index) => ({
      resourceType: 'payment_term',
      key: `net-${days}`,
      position: 60 + index * 10,
      properties: [
        stringProp('name', `Net ${days}`),
        stringProp('rule', 'NET_DAYS'),
        integerProp('dueDays', days),
      ],
    })),
    {
      resourceType: 'invoice_preference',
      key: 'default',
      position: 100,
      properties: [
        stringProp('defaultTaxBehavior', 'EXCLUSIVE'),
        booleanProp('lateFeesEnabled', false),
        stringProp('lateFeeCalculationType', 'PERCENTAGE'),
        integerProp('lateFeeGraceDays', 0),
        booleanProp('lateFeeGenerateAsDraft', true),
      ],
    },
  ]
}

const REGIONAL_STEPS = [
  {
    key: 'workspace',
    description: 'Create the finance workspace.',
    position: 0,
  },
  {
    key: 'currencies',
    description: 'Create configured currencies.',
    position: 10,
  },
  {
    key: 'payment-modes',
    description: 'Create payment modes.',
    position: 20,
  },
  {
    key: 'payment-terms',
    description: 'Create payment terms.',
    position: 30,
  },
  {
    key: 'invoice-preferences',
    description: 'Create invoice preferences.',
    position: 40,
  },
]

export type RegionalProvisioningSeedSummary = {
  setupsProcessed: number
  setupsCreated: number
  policiesSeeded: number
  manifestsPublished: number
  fallbackKey: string
}

async function ensurePresetManifest(
  preset: RegionalProvisioningPreset,
  now: bigint
): Promise<boolean> {
  const published = await findPublished('finance', preset.key)
  if (published) return false

  // Preserve an operator-authored draft. Regional seeds only create a manifest
  // when the setup has no finance work in progress.
  const draft = await findRevision('finance', preset.key, 'draft')
  if (draft) return false

  await replaceDraft({
    targetType: 'finance',
    targetKey: preset.key,
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    financeDependency: 'none',
    financeScopes: [],
    resources: resourcesForPreset(preset),
    steps: REGIONAL_STEPS,
    now,
  })
  await publishDraft('finance', preset.key, now)
  return true
}

export async function seedRegionalProvisioningSetups(): Promise<RegionalProvisioningSeedSummary> {
  const now = BigInt(nowUnixSeconds())
  let setupsCreated = 0
  let policiesSeeded = 0
  let manifestsPublished = 0
  let fallbackId: string | null = null

  for (const preset of ALL_REGIONAL_PROVISIONING_PRESETS) {
    let setup = await findRegionalSetupByKey(preset.key)
    if (!setup) {
      await createRegionalSetup({
        id: generateId('provisioningSetup'),
        key: preset.key,
        name: preset.name,
        description: preset.description,
        countryCode: preset.countryCode,
        currencyCode: preset.currency.code,
        now,
      })
      setupsCreated += 1
      setup = await findRegionalSetupByKey(preset.key)
    }

    if (!setup) continue
    if (preset.isFallback) fallbackId = setup.id

    const hadPolicy =
      setup.conditions.length > 0 || setup.entitlements.length > 0
    await seedRegionalSetupPolicy({
      setupId: setup.id,
      conditions: preset.countryCode
        ? [
            {
              id: generateId('provisioningSetupCondition'),
              groupKey: preset.countryCode.toLowerCase(),
              field: 'country',
              operator: 'equals',
              value: preset.countryCode,
              priority: 100,
            },
          ]
        : [],
      entitlements: preset.entitlements.map((entitlement) => ({
        id: generateId('provisioningSetupEntitlement'),
        targetType: entitlement.targetType,
        targetKey: entitlement.targetKey,
        enabled: entitlement.enabled,
      })),
      now,
    })
    if (!hadPolicy) policiesSeeded += 1

    if (await ensurePresetManifest(preset, now)) manifestsPublished += 1
  }

  if (!fallbackId)
    throw new Error('Global USD provisioning fallback was not created.')

  await setRegionalFallbackDefault(fallbackId, now)
  log.info(
    {
      setups_created: setupsCreated,
      policies_seeded: policiesSeeded,
      manifests_published: manifestsPublished,
      fallback_key: 'global-usd',
    },
    'provisioning.regional_seed.completed'
  )

  return {
    setupsProcessed: ALL_REGIONAL_PROVISIONING_PRESETS.length,
    setupsCreated,
    policiesSeeded,
    manifestsPublished,
    fallbackKey: 'global-usd',
  }
}
