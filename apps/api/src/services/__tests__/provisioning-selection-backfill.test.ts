import type { ProvisioningSetupSelection } from '@876/core/types/provisioning-selection'
import { describe, expect, it, vi } from 'vitest'

import {
  backfillProvisioningSelections,
  type ProvisioningSelectionBackfillDependencies,
} from '../provisioning-selection-backfill'

const SELECTED_AT = 1_788_163_200

function selection(
  setupKey: string,
  matchType: 'policy' | 'fallback' = 'policy'
): ProvisioningSetupSelection {
  return {
    setup_id: `setup-${setupKey}`,
    setup_key: setupKey,
    match_type: matchType,
    match_group_key: matchType === 'policy' ? setupKey : null,
    match_priority: matchType === 'policy' ? 10 : null,
    matched_fields: matchType === 'policy' ? ['country'] : [],
    context: {
      country: matchType === 'policy' ? 'JM' : null,
      subdivision: null,
      jurisdiction: null,
    },
  }
}

function dependencies(overrides: Partial<ProvisioningSelectionBackfillDependencies> = {}) {
  return {
    listMissing: vi.fn(async () => []),
    resolve: vi.fn(async () => selection('jamaica')),
    persist: vi.fn(async () => true),
    ...overrides,
  } satisfies ProvisioningSelectionBackfillDependencies
}

describe('backfillProvisioningSelections', () => {
  it('resolves and reports rows without writing during dry run', async () => {
    // ARRANGE
    const deps = dependencies({
      listMissing: vi.fn(async () => [
        {
          id: 'org_1',
          countryCode: 'JM',
          region: null,
        },
      ]),
    })

    // ACT
    const result = await backfillProvisioningSelections(
      { dryRun: true, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(result).toEqual({
      object: 'provisioning_selection_backfill',
      dry_run: true,
      examined: 1,
      resolved: 1,
      written: 0,
      skipped_concurrent: 0,
      setup_counts: { jamaica: 1 },
      last_organization_id: 'org_1',
    })
    expect(deps.resolve).toHaveBeenCalledTimes(1)
    expect(deps.resolve).toHaveBeenCalledWith({
      country: 'JM',
      subdivision: null,
      jurisdiction: null,
    })
    expect(deps.persist).not.toHaveBeenCalled()
  })

  it('persists a backfill decision with the requested selection timestamp', async () => {
    // ARRANGE
    const resolved = selection('jamaica')
    const deps = dependencies({
      listMissing: vi.fn(async () => [
        { id: 'org_1', countryCode: 'JM', region: null },
      ]),
      resolve: vi.fn(async () => resolved),
    })

    // ACT
    const result = await backfillProvisioningSelections(
      { selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(result.written).toBe(1)
    expect(result.skipped_concurrent).toBe(0)
    expect(deps.persist).toHaveBeenCalledTimes(1)
    expect(deps.persist).toHaveBeenCalledWith({
      organizationId: 'org_1',
      selection: resolved,
      selectedAt: SELECTED_AT,
    })
  })

  it('counts a conditional-write loss as a concurrent skip instead of a failure', async () => {
    // ARRANGE
    const deps = dependencies({
      listMissing: vi.fn(async () => [
        { id: 'org_1', countryCode: 'JM', region: null },
      ]),
      persist: vi.fn(async () => false),
    })

    // ACT
    const result = await backfillProvisioningSelections(
      { selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(result).toEqual({
      object: 'provisioning_selection_backfill',
      dry_run: false,
      examined: 1,
      resolved: 1,
      written: 0,
      skipped_concurrent: 1,
      setup_counts: { jamaica: 1 },
      last_organization_id: 'org_1',
    })
  })

  it('builds subdivision context from the canonical Region row', async () => {
    // ARRANGE
    const deps = dependencies({
      listMissing: vi.fn(async () => [
        {
          id: 'org_1',
          countryCode: 'US',
          region: { code: 'CA', countryCode: 'US' },
        },
      ]),
    })

    // ACT
    await backfillProvisioningSelections(
      { dryRun: true, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(deps.resolve).toHaveBeenCalledWith({
      country: 'US',
      subdivision: 'US-CA',
      jurisdiction: null,
    })
  })

  it('uses organization country ahead of a conflicting Region country', async () => {
    // ARRANGE
    const deps = dependencies({
      listMissing: vi.fn(async () => [
        {
          id: 'org_1',
          countryCode: 'CA',
          region: { code: 'CA', countryCode: 'US' },
        },
      ]),
    })

    // ACT
    await backfillProvisioningSelections(
      { dryRun: true, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(deps.resolve).toHaveBeenCalledWith({
      country: 'CA',
      subdivision: 'CA-CA',
      jurisdiction: null,
    })
  })

  it('paginates by the last organization id and aggregates setup counts', async () => {
    // ARRANGE
    const listMissing = vi
      .fn<ProvisioningSelectionBackfillDependencies['listMissing']>()
      .mockResolvedValueOnce([
        { id: 'org_1', countryCode: 'JM', region: null },
        { id: 'org_2', countryCode: 'US', region: null },
      ])
      .mockResolvedValueOnce([
        { id: 'org_3', countryCode: null, region: null },
      ])
    const resolve = vi
      .fn<ProvisioningSelectionBackfillDependencies['resolve']>()
      .mockResolvedValueOnce(selection('jamaica'))
      .mockResolvedValueOnce(selection('united-states'))
      .mockResolvedValueOnce(selection('global-usd', 'fallback'))
    const deps = dependencies({ listMissing, resolve })

    // ACT
    const result = await backfillProvisioningSelections(
      { dryRun: true, pageSize: 2, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    expect(listMissing).toHaveBeenCalledTimes(2)
    expect(listMissing).toHaveBeenNthCalledWith(1, {
      limit: 2,
      startingAfter: null,
    })
    expect(listMissing).toHaveBeenNthCalledWith(2, {
      limit: 2,
      startingAfter: 'org_2',
    })
    expect(result).toEqual({
      object: 'provisioning_selection_backfill',
      dry_run: true,
      examined: 3,
      resolved: 3,
      written: 0,
      skipped_concurrent: 0,
      setup_counts: {
        jamaica: 1,
        'united-states': 1,
        'global-usd': 1,
      },
      last_organization_id: 'org_3',
    })
  })

  it('honors maxOrganizations without reading or resolving beyond the limit', async () => {
    // ARRANGE
    const deps = dependencies({
      listMissing: vi.fn(async ({ limit }) =>
        [
          { id: 'org_1', countryCode: 'JM', region: null },
          { id: 'org_2', countryCode: 'JM', region: null },
          { id: 'org_3', countryCode: 'JM', region: null },
        ].slice(0, limit)
      ),
    })

    // ACT
    const result = await backfillProvisioningSelections(
      {
        dryRun: true,
        pageSize: 100,
        maxOrganizations: 2,
        selectedAt: SELECTED_AT,
      },
      deps
    )

    // ASSERT
    expect(result.examined).toBe(2)
    expect(deps.listMissing).toHaveBeenCalledTimes(1)
    expect(deps.listMissing).toHaveBeenCalledWith({
      limit: 2,
      startingAfter: null,
    })
    expect(deps.resolve).toHaveBeenCalledTimes(2)
  })

  it.each([0, -1, 501, 1.5])('rejects invalid page size %s before reading the database', async (pageSize) => {
    // ARRANGE
    const deps = dependencies()

    // ACT
    const act = backfillProvisioningSelections(
      { pageSize, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    await expect(act).rejects.toThrow(
      'Provisioning selection backfill page size must be 1-500.'
    )
    expect(deps.listMissing).not.toHaveBeenCalled()
    expect(deps.resolve).not.toHaveBeenCalled()
    expect(deps.persist).not.toHaveBeenCalled()
  })

  it.each([0, -2, 1.5])('rejects invalid maximum %s before reading the database', async (maxOrganizations) => {
    // ARRANGE
    const deps = dependencies()

    // ACT
    const act = backfillProvisioningSelections(
      { maxOrganizations, selectedAt: SELECTED_AT },
      deps
    )

    // ASSERT
    await expect(act).rejects.toThrow(
      'Provisioning selection backfill maxOrganizations must be a positive integer.'
    )
    expect(deps.listMissing).not.toHaveBeenCalled()
    expect(deps.resolve).not.toHaveBeenCalled()
    expect(deps.persist).not.toHaveBeenCalled()
  })
})
