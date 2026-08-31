import type {
  ProvisioningSelectionCandidate,
  ProvisioningSelectionContext,
  ProvisioningSetupSelection,
} from '@876/core/types/provisioning-selection'
import type {
  ProvisioningSetupConditionField,
  ProvisioningSetupPolicy,
} from '@876/core/types/provisioning-policy'

import { AppHttpError } from '@/http/errors'

import * as repository from './provisioning-selection.repository'

export type ProvisioningWorkspaceDefaults = {
  setup_key: string
  finance_revision_id: string
  finance_revision: number
  country_code: string | null
  currency_code: string
  language: string
}

type CandidateMatch = {
  candidate: ProvisioningSelectionCandidate
  groupKey: string
  priority: number
  fields: ProvisioningSetupConditionField[]
}

function normalizedContext(
  context: Partial<ProvisioningSelectionContext>
): ProvisioningSelectionContext {
  return {
    country: context.country?.trim().toUpperCase() || null,
    subdivision: context.subdivision?.trim().toUpperCase() || null,
    jurisdiction: context.jurisdiction?.trim() || null,
  }
}

function serializeCandidate(row: Awaited<ReturnType<typeof repository.listActivePublishedSelectionSetups>>[number]): ProvisioningSelectionCandidate {
  const policy: Pick<ProvisioningSetupPolicy, 'conditions' | 'entitlements'> = {
    conditions: row.conditions.map((condition) => ({
      object: 'provisioning_setup_condition',
      id: condition.id,
      group_key: condition.groupKey,
      field: condition.field as ProvisioningSetupConditionField,
      operator: 'equals',
      value: condition.value,
      priority: condition.priority,
      created_at: Number(condition.createdAt),
      updated_at: Number(condition.updatedAt),
    })),
    entitlements: row.entitlements.map((entitlement) => ({
      object: 'provisioning_setup_entitlement',
      id: entitlement.id,
      target_type: entitlement.targetType as ProvisioningSetupPolicy['entitlements'][number]['target_type'],
      target_key: entitlement.targetKey,
      enabled: entitlement.enabled,
      created_at: Number(entitlement.createdAt),
      updated_at: Number(entitlement.updatedAt),
    })),
  }

  return {
    id: row.id,
    key: row.key,
    is_default: row.isDefault,
    policy,
  }
}

function contextValue(
  context: ProvisioningSelectionContext,
  field: ProvisioningSetupConditionField
): string | null {
  if (field === 'country') return context.country
  if (field === 'subdivision') return context.subdivision
  return context.jurisdiction
}

function bestMatchForCandidate(
  candidate: ProvisioningSelectionCandidate,
  context: ProvisioningSelectionContext
): CandidateMatch | null {
  const groups = new Map<
    string,
    ProvisioningSelectionCandidate['policy']['conditions']
  >()
  for (const condition of candidate.policy.conditions) {
    const group = groups.get(condition.group_key) ?? []
    group.push(condition)
    groups.set(condition.group_key, group)
  }

  const matches: CandidateMatch[] = []
  for (const [groupKey, conditions] of groups) {
    if (conditions.length === 0) continue
    const matchesAll = conditions.every((condition) => {
      const actual = contextValue(context, condition.field)
      return actual !== null && actual === condition.value
    })
    if (!matchesAll) continue

    const fields = [...new Set(conditions.map((condition) => condition.field))]
    matches.push({
      candidate,
      groupKey,
      priority: conditions[0]?.priority ?? 0,
      fields,
    })
  }

  matches.sort(compareMatches)
  return matches[0] ?? null
}

function compareMatches(left: CandidateMatch, right: CandidateMatch): number {
  // More specific policy wins. Priority is an operator-controlled tie-break for
  // alternatives of equal specificity; lexical keys make the final result
  // deterministic even if two policies are otherwise identical.
  if (left.fields.length !== right.fields.length)
    return right.fields.length - left.fields.length
  if (left.priority !== right.priority) return right.priority - left.priority
  const setup = left.candidate.key.localeCompare(right.candidate.key)
  if (setup !== 0) return setup
  return left.groupKey.localeCompare(right.groupKey)
}

export function resolveProvisioningSetupFromCandidates(
  candidates: ProvisioningSelectionCandidate[],
  rawContext: Partial<ProvisioningSelectionContext>
): ProvisioningSetupSelection {
  const context = normalizedContext(rawContext)
  const matches = candidates
    .map((candidate) => bestMatchForCandidate(candidate, context))
    .filter((match): match is CandidateMatch => match !== null)
    .sort(compareMatches)

  const match = matches[0]
  if (match) {
    return {
      setup_id: match.candidate.id,
      setup_key: match.candidate.key,
      match_type: 'policy',
      match_group_key: match.groupKey,
      match_priority: match.priority,
      matched_fields: match.fields,
      context,
    }
  }

  const fallbacks = candidates.filter((candidate) => candidate.is_default)
  if (fallbacks.length !== 1) {
    throw new AppHttpError({
      code: 'provisioning/setup-fallback-invalid',
      message:
        'Provisioning setup selection requires exactly one active published fallback.',
      httpStatus: 500,
    })
  }

  const fallback = fallbacks[0]!
  return {
    setup_id: fallback.id,
    setup_key: fallback.key,
    match_type: 'fallback',
    match_group_key: null,
    match_priority: null,
    matched_fields: [],
    context,
  }
}

export async function resolveProvisioningSetup(
  context: Partial<ProvisioningSelectionContext>
): Promise<ProvisioningSetupSelection> {
  const rows = await repository.listActivePublishedSelectionSetups()
  if (rows.length === 0) {
    throw new AppHttpError({
      code: 'provisioning/setup-unavailable',
      message: 'No active published provisioning setup is available.',
      httpStatus: 503,
    })
  }
  return resolveProvisioningSetupFromCandidates(rows.map(serializeCandidate), context)
}

function referenceValue(
  properties: Awaited<ReturnType<typeof repository.retrievePublishedFinanceWorkspaceProperties>> extends infer Row
    ? Row extends { provisioningResources: Array<infer Resource> }
      ? Resource extends { provisioningProperties: infer Properties }
        ? Properties
        : never
      : never
    : never,
  key: string
): string | null {
  const property = (properties as Array<{
    key: string
    valueType: string
    stringValue: string | null
    referenceKey: string | null
  }>).find((candidate) => candidate.key === key)
  if (!property) return null
  if (property.valueType === 'reference') return property.referenceKey
  return property.stringValue
}

export async function retrieveProvisioningWorkspaceDefaults(
  setupKey: string
): Promise<ProvisioningWorkspaceDefaults> {
  const revision =
    await repository.retrievePublishedFinanceWorkspaceProperties(setupKey)
  const workspace = revision?.provisioningResources[0]
  if (!revision || !workspace) {
    throw new AppHttpError({
      code: 'provisioning/finance-profile-missing',
      message: `Published finance provisioning profile is missing for setup ${setupKey}.`,
      httpStatus: 500,
    })
  }

  const properties = workspace.provisioningProperties
  const currency =
    referenceValue(properties, 'defaultCurrency') ??
    referenceValue(properties, 'baseCurrency')
  const language = referenceValue(properties, 'defaultLanguage')
  if (!currency || !language) {
    throw new AppHttpError({
      code: 'provisioning/finance-profile-invalid',
      message: `Published finance provisioning profile ${setupKey} is missing workspace currency or language defaults.`,
      httpStatus: 500,
    })
  }

  return {
    setup_key: setupKey,
    finance_revision_id: revision.id,
    finance_revision: revision.revision,
    country_code: referenceValue(properties, 'countryCode'),
    currency_code: currency.toUpperCase(),
    language,
  }
}

export async function retrieveProvisioningSetupPolicy(
  setupKey: string
): Promise<ProvisioningSetupPolicy> {
  const rows = await repository.listActivePublishedSelectionSetups()
  const row = rows.find((candidate) => candidate.key === setupKey)
  if (!row) {
    throw new AppHttpError({
      code: 'provisioning/setup-not-found',
      message: 'Provisioning setup was not found or is not publishable.',
      httpStatus: 404,
    })
  }
  const candidate = serializeCandidate(row)
  return {
    object: 'provisioning_setup_policy',
    setup_id: candidate.id,
    setup_key: candidate.key,
    conditions: candidate.policy.conditions,
    entitlements: candidate.policy.entitlements,
    updated_at: Math.max(
      0,
      ...candidate.policy.conditions.map((entry) => entry.updated_at),
      ...candidate.policy.entitlements.map((entry) => entry.updated_at)
    ),
  }
}
