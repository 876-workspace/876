import type {
  ProvisioningSelectionContext,
  ProvisioningSetupSelection,
} from '@876/core/types/provisioning-selection'

import { resolveProvisioningSetup } from '@/modules/provisioning'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  organizationSelectionContext,
  persistBackfillProvisioningSelection,
  provisioningPolicyRepository,
} from './provisioning-policy'

export type ProvisioningSelectionBackfillRow = {
  id: string
  countryCode: string | null
  region?: { code: string; countryCode: string } | null
}

export type ProvisioningSelectionBackfillDependencies = {
  listMissing(params: {
    limit: number
    startingAfter?: string | null
  }): Promise<ProvisioningSelectionBackfillRow[]>
  resolve(
    context: Partial<ProvisioningSelectionContext>
  ): Promise<ProvisioningSetupSelection>
  persist(params: {
    organizationId: string
    selection: ProvisioningSetupSelection
    selectedAt: number
  }): Promise<boolean>
}

export type ProvisioningSelectionBackfillOptions = {
  dryRun?: boolean
  pageSize?: number
  maxOrganizations?: number | null
  selectedAt?: number
}

export type ProvisioningSelectionBackfillSummary = {
  object: 'provisioning_selection_backfill'
  dry_run: boolean
  examined: number
  resolved: number
  written: number
  skipped_concurrent: number
  setup_counts: Record<string, number>
  last_organization_id: string | null
}

const defaultDependencies: ProvisioningSelectionBackfillDependencies = {
  listMissing: (params) =>
    provisioningPolicyRepository.listOrganizationsMissingProvisioningSelection(
      params
    ),
  resolve: (context) => resolveProvisioningSetup(context),
  persist: (params) => persistBackfillProvisioningSelection(params),
}

function boundedPageSize(value: number | undefined): number {
  if (value === undefined) return 100
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error('Provisioning selection backfill page size must be 1-500.')
  }
  return value
}

function boundedMaximum(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      'Provisioning selection backfill maxOrganizations must be a positive integer.'
    )
  }
  return value
}

/**
 * Explicitly assign provisioning setups to pre-Phase-2 organizations.
 *
 * This is intentionally separate from signup and ordinary provisioning. It
 * only reads organizations whose `provisioningSetupKey` is still null and the
 * repository write is conditional on that field remaining null, so repeated or
 * concurrent runs never overwrite an existing selection.
 */
export async function backfillProvisioningSelections(
  options: ProvisioningSelectionBackfillOptions = {},
  dependencies: ProvisioningSelectionBackfillDependencies = defaultDependencies
): Promise<ProvisioningSelectionBackfillSummary> {
  const dryRun = options.dryRun ?? false
  const pageSize = boundedPageSize(options.pageSize)
  const maxOrganizations = boundedMaximum(options.maxOrganizations)
  const selectedAt = options.selectedAt ?? nowUnixSeconds()

  let cursor: string | null = null
  let examined = 0
  let resolved = 0
  let written = 0
  let skippedConcurrent = 0
  const setupCounts: Record<string, number> = {}

  while (maxOrganizations === null || examined < maxOrganizations) {
    const remaining =
      maxOrganizations === null ? pageSize : maxOrganizations - examined
    const take = Math.min(pageSize, remaining)
    if (take <= 0) break

    const rows = await dependencies.listMissing({
      limit: take,
      startingAfter: cursor,
    })
    if (rows.length === 0) break

    for (const row of rows) {
      examined += 1
      cursor = row.id

      const selection = await dependencies.resolve(
        organizationSelectionContext(row)
      )
      resolved += 1
      setupCounts[selection.setup_key] =
        (setupCounts[selection.setup_key] ?? 0) + 1

      if (dryRun) continue

      const didWrite = await dependencies.persist({
        organizationId: row.id,
        selection,
        selectedAt,
      })
      if (didWrite) written += 1
      else skippedConcurrent += 1
    }

    if (rows.length < take) break
  }

  return {
    object: 'provisioning_selection_backfill',
    dry_run: dryRun,
    examined,
    resolved,
    written,
    skipped_concurrent: skippedConcurrent,
    setup_counts: setupCounts,
    last_organization_id: cursor,
  }
}
