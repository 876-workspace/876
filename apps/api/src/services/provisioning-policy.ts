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
  type ProvisioningWorkspaceDefaults,
} from '@/modules/provisioning/provisioning-selection.service'

import * as repository from './provisioning-policy.repository'

export type { ProvisioningWorkspaceDefaults } from '@/modules/provisioning/provisioning-selection.service'

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

const RESOURCE_WORK_REQUIRED_SCOPES = [
  'work.tasks.read',
  'work.reminders.read',
  'work.events.read',
] as const satisfies readonly WorkIntegrationScope[]

export type PersistedProvisioningPolicy = {
  selection: PersistedProvisioningSelection
  policy: ProvisioningSetupPolicy
}

export type InitialProvisioningPolicy = PersistedProvisioningPolicy & {
  defaults: ProvisioningWorkspaceDefaults
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

  if (RESOURCE_WORK_REQUIRED_SCOPES.every((scope) => scopes.has(scope)))
    scopes.add('work.resource-work.read')

  return scopes
}

/**
 * A setup may narrow an app's Work access, never expand the app's declared
 * integration grant. CRM remains the only provisioned Work service consumer;
 * Invoice's widget uses the signed-in session tier instead of a service grant.
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
): Promise<{
  selection: ProvisioningSetupSelection
  defaults: ProvisioningWorkspaceDefaults
  policy: ProvisioningSetupPolicy
}> {
  const selection = await resolveProvisioningSetup(context)
  const defaults = await retrieveProvisioningWorkspaceDefaults(
    selection.setup_key
  )
  const policy = await retrieveProvisioningSetupPolicy(selection.setup_key)
  return { selection, defaults, policy }
}

function serializePersistedSelection(row: {
  provisioningSetupKey: string
  provisioningSelectionType: string | null
  provisioningMatchGroupKey: string | null
  provisioningMatchPriority: number | null
  provisioningMatchedFields: unknown
  provisioningSetupSelectedAt: bigint | null
}): PersistedProvisioningSelection {
  return {
    setup_key: row.provisioningSetupKey,
    selection_type:
      (row.provisioningSelectionType as ProvisioningStoredSelectionType | null) ??
      null,
    match_group_key: row.provisioningMatchGroupKey,
    match_priority: row.provisioningMatchPriority,
    matched_fields: Array.isArray(row.provisioningMatchedFields)
      ? (row.provisioningMatchedFields as PersistedProvisioningSelection['matched_fields'])
      : [],
    selected_at:
      row.provisioningSetupSelectedAt !== null
        ? Number(row.provisioningSetupSelectedAt)
        : null,
  }
}

export async function retrievePersistedProvisioningPolicy(
  organizationId: string
): Promise<PersistedProvisioningPolicy | null> {
  const row =
    await repository.findOrganizationProvisioningSelection(organizationId)
  if (!row?.provisioningSetupKey) return null

  const selection = serializePersistedSelection({
    ...row,
    provisioningSetupKey: row.provisioningSetupKey,
  })
  const policy = await retrieveProvisioningSetupPolicy(selection.setup_key)
  return { selection, policy }
}

export async function requirePersistedProvisioningPolicy(
  organizationId: string
): Promise<PersistedProvisioningPolicy> {
  const persisted = await retrievePersistedProvisioningPolicy(organizationId)
  if (persisted) return persisted

  throw new AppHttpError({
    code: 'provisioning/setup-selection-missing',
    message:
      'The organization has no persisted provisioning setup. Run the provisioning setup backfill before retrying.',
    httpStatus: 409,
  })
}

export async function persistInitialProvisioningSelection(params: {
  organizationId: string
  selection: ProvisioningSetupSelection
}) {
  await repository.persistProvisioningSelection(params)
}
