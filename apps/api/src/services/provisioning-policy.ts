import type {
  ProvisioningSetupEntitlement,
  ProvisioningSetupPolicy,
} from '@876/core/types/provisioning-policy'
import type {
  PersistedProvisioningSelection,
  ProvisioningSelectionContext,
  ProvisioningSetupSelection,
  ProvisioningStoredSelectionType,
} from '@876/core/types/provisioning-selection'
import {
  WORK_CRM_INTEGRATION_SCOPES,
  type WorkIntegrationScope,
} from '@876/work'

import { AppHttpError } from '@/http/errors'
import {
  resolveProvisioningSetup,
  retrieveProvisioningSetupPolicy,
  retrieveProvisioningWorkspaceDefaults,
} from '@/modules/provisioning'

import * as repository from './provisioning-policy.repository'

const ENTERPRISE_APP_SLUG = '876-enterprise'
const WORK_SERVICE_KEY = 'work'

const WORK_CAPABILITY_SCOPES: Readonly<
  Record<string, readonly WorkIntegrationScope[]>
> = {
  'work.tasks': ['work.tasks.read', 'work.tasks.write'],
  'work.reminders': ['work.reminders.read', 'work.reminders.write'],
  'work.calendars': ['work.calendars.read', 'work.calendars.write'],
  'work.events': ['work.events.read', 'work.events.write'],
  'work.alerts': ['work.alerts.read', 'work.alerts.write'],
  'work.my-work': ['work.my-work.read'],
  'work.sync': ['work.sync.read', 'work.sync.write'],
}

function entitlement(
  policy: ProvisioningSetupPolicy,
  targetType: ProvisioningSetupEntitlement['target_type'],
  targetKey: string
): ProvisioningSetupEntitlement | null {
  return (
    policy.entitlements.find(
      (entry) =>
        entry.target_type === targetType && entry.target_key === targetKey
    ) ?? null
  )
}

export function enabledProvisioningApplicationSlugs(
  policy: ProvisioningSetupPolicy
): string[] {
  const enabled = policy.entitlements
    .filter((entry) => entry.target_type === 'application' && entry.enabled)
    .map((entry) => entry.target_key)

  if (!enabled.includes(ENTERPRISE_APP_SLUG))
    enabled.unshift(ENTERPRISE_APP_SLUG)
  return [...new Set(enabled)]
}

export function isProvisionedWorkEnabled(
  policy: ProvisioningSetupPolicy
): boolean {
  return entitlement(policy, 'service', WORK_SERVICE_KEY)?.enabled === true
}

export function enabledWorkCapabilityScopes(
  policy: ProvisioningSetupPolicy
): Set<WorkIntegrationScope> {
  const scopes = new Set<WorkIntegrationScope>()
  if (!isProvisionedWorkEnabled(policy)) return scopes

  for (const entry of policy.entitlements) {
    if (entry.target_type !== 'service_capability' || !entry.enabled) continue
    for (const scope of WORK_CAPABILITY_SCOPES[entry.target_key] ?? [])
      scopes.add(scope)
  }
  return scopes
}

/**
 * A setup may narrow an app's Work access, never expand the app's declared
 * integration grant. CRM is the only Work-consuming product today.
 */
export function workScopesForProvisionedApp(
  appSlug: string,
  policy: ProvisioningSetupPolicy
): WorkIntegrationScope[] {
  const enabled = enabledWorkCapabilityScopes(policy)
  const appGrant: readonly WorkIntegrationScope[] =
    appSlug === '876-crm' ? WORK_CRM_INTEGRATION_SCOPES : []
  return appGrant.filter((scope) => enabled.has(scope))
}

export async function resolveInitialProvisioningSelection(
  context: Partial<ProvisioningSelectionContext>
) {
  const selection = await resolveProvisioningSetup(context)
  const defaults = await retrieveProvisioningWorkspaceDefaults(
    selection.setup_key
  )
  const policy = await retrieveProvisioningSetupPolicy(selection.setup_key)
  return { selection, defaults, policy }
}

export async function retrievePersistedProvisioningPolicy(
  organizationId: string
): Promise<{
  selection: PersistedProvisioningSelection
  policy: ProvisioningSetupPolicy
} | null> {
  const row =
    await repository.findOrganizationProvisioningSelection(organizationId)
  if (!row?.provisioningSetupKey) return null

  const selection: PersistedProvisioningSelection = {
    setup_key: row.provisioningSetupKey,
    selection_type:
      (row.provisioningSelectionType as ProvisioningStoredSelectionType | null) ??
      null,
    match_group_key: row.provisioningMatchGroupKey,
    match_priority: row.provisioningMatchPriority,
    matched_fields:
      row.provisioningMatchedFields as PersistedProvisioningSelection['matched_fields'],
    selected_at: row.provisioningSetupSelectedAt
      ? Number(row.provisioningSetupSelectedAt)
      : null,
  }
  const policy = await retrieveProvisioningSetupPolicy(selection.setup_key)
  return { selection, policy }
}

export async function persistInitialProvisioningSelection(params: {
  organizationId: string
  selection: ProvisioningSetupSelection
  selectedAt: number
}): Promise<PersistedProvisioningSelection> {
  if (
    params.selection.match_type === 'persisted' ||
    params.selection.match_type === 'backfill'
  ) {
    throw new Error(
      'Initial provisioning selection must originate from policy or fallback resolution.'
    )
  }

  await repository.persistOrganizationProvisioningSelection({
    organizationId: params.organizationId,
    setupKey: params.selection.setup_key,
    selectionType: params.selection.match_type,
    matchGroupKey: params.selection.match_group_key,
    matchPriority: params.selection.match_priority,
    matchedFields: params.selection.matched_fields,
    selectedAt: BigInt(params.selectedAt),
  })

  const persisted = await retrievePersistedProvisioningPolicy(
    params.organizationId
  )
  if (!persisted) {
    throw new AppHttpError({
      code: 'provisioning/setup-selection-persist-failed',
      message: 'The organization provisioning setup could not be persisted.',
      httpStatus: 500,
    })
  }
  return persisted.selection
}

export async function persistBackfillProvisioningSelection(params: {
  organizationId: string
  selection: ProvisioningSetupSelection
  selectedAt: number
}): Promise<boolean> {
  return repository.persistOrganizationProvisioningSelection({
    organizationId: params.organizationId,
    setupKey: params.selection.setup_key,
    selectionType: 'backfill',
    matchGroupKey: params.selection.match_group_key,
    matchPriority: params.selection.match_priority,
    matchedFields: params.selection.matched_fields,
    selectedAt: BigInt(params.selectedAt),
  })
}

export function organizationSelectionContext(row: {
  countryCode: string | null
  region?: { code: string; countryCode: string } | null
}): ProvisioningSelectionContext {
  const country = row.countryCode ?? row.region?.countryCode ?? null
  return {
    country: country?.toUpperCase() ?? null,
    subdivision:
      row.region && country
        ? `${country.toUpperCase()}-${row.region.code.toUpperCase()}`
        : null,
    jurisdiction: null,
  }
}

export { repository as provisioningPolicyRepository }
