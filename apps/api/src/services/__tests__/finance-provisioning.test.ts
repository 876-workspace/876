import type { Mocked } from '@/test/mocked'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  FINANCE_EVENT_CONTRACT_VERSION,
  FINANCE_EVENT_TYPE,
  desiredFinanceConnectionStatus,
  enqueueFinanceConnectionEvent,
  financeEventPayload,
  financeWorkspaceName,
  financeWorkspaceSlug,
  reconcileFinanceConnections,
} from '../finance-provisioning'
import type {
  FinanceProvisioningDeps,
  FinanceProvisioningRepository,
  OrganizationRow,
} from '../finance-provisioning'

const NOW = 1_700_000_000

function makeRepository(
  overrides: Partial<FinanceProvisioningRepository> = {}
): Mocked<FinanceProvisioningRepository> {
  return {
    findSubscriptionById: vi.fn(),
    findOrganizationById: vi.fn(),
    findAppById: vi.fn(),
    listSubscriptionsByOrgAndApp: vi.fn(),
    findPublishedRevision: vi.fn(),
    findLatestOutboxEvent: vi.fn(),
    createOutboxEvent: vi.fn(),
    updateOutboxEventRunId: vi.fn(),
    updateSubscriptionsLifecycleVersion: vi.fn(),
    createRunForApplication: vi.fn(),
    createRunForEvent: vi.fn(),
    listSubscriptionsForReconcile: vi.fn(),
    ...overrides,
  } as unknown as Mocked<FinanceProvisioningRepository>
}

function org(overrides: Partial<OrganizationRow> = {}): OrganizationRow {
  return {
    id: 'org_1',
    name: 'Efesto Technologies',
    shortName: 'Efesto',
    slug: 'efesto',
    status: 'active',
    countryCode: 'JM',
    currencyCode: 'JMD',
    deletedAt: null,
    ...overrides,
  }
}

function app(
  overrides: Partial<{
    id: string
    status: string
    deletedAt: bigint | null
  }> = {}
) {
  return { id: 'rap_couriers', status: 'active', deletedAt: null, ...overrides }
}

function profile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pmr_app_2',
    revision: 2,
    financeDependency: 'embedded',
    financeScopes: ['billing.invoices.write', 'billing.customers.read'],
    steps: [],
    ...overrides,
  }
}

function subscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub_1',
    organizationId: 'org_1',
    appId: 'rap_couriers',
    status: 'active',
    financeLifecycleVersion: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  return () => vi.useRealTimers()
})

describe('desiredFinanceConnectionStatus', () => {
  it('maps active states', () => {
    expect(desiredFinanceConnectionStatus('active')).toBe('ACTIVE')
    expect(desiredFinanceConnectionStatus('trialing')).toBe('ACTIVE')
    expect(desiredFinanceConnectionStatus(' Active ')).toBe('ACTIVE')
  })

  it('maps revoked states', () => {
    expect(desiredFinanceConnectionStatus('canceled')).toBe('REVOKED')
    expect(desiredFinanceConnectionStatus('incomplete_expired')).toBe('REVOKED')
  })

  it('denies unknown states as SUSPENDED', () => {
    expect(desiredFinanceConnectionStatus('past_due')).toBe('SUSPENDED')
    expect(desiredFinanceConnectionStatus('future_provider_state')).toBe(
      'SUSPENDED'
    )
  })
})

describe('financeWorkspaceName', () => {
  it('prefers name then shortName then slug then id', () => {
    expect(financeWorkspaceName(org({ name: 'Acme' }))).toBe('Acme')
    expect(financeWorkspaceName(org({ name: null, shortName: 'Short' }))).toBe(
      'Short'
    )
    expect(
      financeWorkspaceName(
        org({ name: null, shortName: null, slug: 'my-slug' })
      )
    ).toBe('my-slug')
  })

  it('trims and truncates at 160', () => {
    const name = ` ${'E'.repeat(200)} `
    expect(financeWorkspaceName(org({ name }))).toBe('E'.repeat(160))
  })
})

describe('financeWorkspaceSlug', () => {
  it('normalizes slug', () => {
    expect(financeWorkspaceSlug(org({ slug: 'Efesto' }))).toBe('efesto')
  })

  it('falls back to org id suffix when normalized slug too short', () => {
    const o = org({ slug: 'a', id: 'org_12345678' })
    const slug = financeWorkspaceSlug(o)
    expect(slug.startsWith('a-')).toBe(true)
    expect(slug.length).toBeGreaterThanOrEqual(2)
    expect(slug.length).toBeLessThanOrEqual(80)
  })
})

describe('financeEventPayload', () => {
  it('serializes the billing contract', () => {
    const event = {
      id: 'fpe_1',
      eventType: FINANCE_EVENT_TYPE,
      contractVersion: FINANCE_EVENT_CONTRACT_VERSION,
      aggregateId: 'org_1:rap_couriers',
      organizationId: 'org_1',
      organizationName: 'Efesto',
      organizationSlug: 'efesto',
      organizationCountryCode: 'JM',
      organizationCurrencyCode: 'JMD',
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      provisioningVersion: 2,
      lifecycleVersion: 1,
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read'],
      occurredAt: BigInt(1_700_000_000),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(1_700_000_000),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(1_700_000_000),
      updatedAt: BigInt(1_700_000_000),
      runId: null,
    }
    expect(financeEventPayload(event as never)).toEqual({
      eventId: 'fpe_1',
      eventType: FINANCE_EVENT_TYPE,
      contractVersion: FINANCE_EVENT_CONTRACT_VERSION,
      aggregateId: 'org_1:rap_couriers',
      organization: {
        id: 'org_1',
        name: 'Efesto',
        slug: 'efesto',
        countryCode: 'JM',
        currencyCode: 'JMD',
      },
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      manifestVersion: 1,
      provisioningRevision: 2,
      lifecycleVersion: 1,
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read'],
      occurredAt: 1_700_000_000,
    })
  })
})

describe('enqueueFinanceConnectionEvent', () => {
  it('appends a versioned finance event for an embedded subscription', async () => {
    const sub = subscription()
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockImplementation(async (targetType) => {
      if (targetType === 'application') return profile() as never
      return null
    })
    repo.findLatestOutboxEvent.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const deps: FinanceProvisioningDeps = { repository: repo }
    const event = (await enqueueFinanceConnectionEvent(
      deps,
      sub as never
    )) as Record<string, unknown>

    expect(event).toBeDefined()
    expect((event as { id: string }).id.startsWith('fpe_')).toBe(true)
    expect(event.aggregateId).toBe('org_1:rap_couriers')
    expect(event.desiredStatus).toBe('ACTIVE')
    // Scopes are sorted
    expect(event.scopes).toEqual([
      'billing.customers.read',
      'billing.invoices.write',
    ])
    expect(event.lifecycleVersion).toBe(1)
    expect(repo.createOutboxEvent).toHaveBeenCalledOnce()
    expect(repo.createRunForEvent).toHaveBeenCalledOnce()
    expect(repo.updateSubscriptionsLifecycleVersion).toHaveBeenCalledWith(
      ['sub_1'],
      1
    )
  })

  it('normalizes workspace display fields to the billing contract', async () => {
    const sub = subscription()
    const longOrg = org({ name: 'E'.repeat(200), slug: 'a' })
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(longOrg)
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockImplementation(async (t) =>
      t === 'application' ? (profile() as never) : null
    )
    repo.findLatestOutboxEvent.mockResolvedValue(null)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )) as Record<string, unknown>

    expect((event as { organizationName: string }).organizationName).toBe(
      'E'.repeat(160)
    )
    const slug = (event as { organizationSlug: string }).organizationSlug
    expect(slug.startsWith('a-')).toBe(true)
    expect(slug.length).toBeGreaterThanOrEqual(2)
    expect(slug.length).toBeLessThanOrEqual(80)
  })

  it('reuses latest outbox event when identical', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      runId: 'prn_existing',
    }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(profile() as never)
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)

    const result = await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )
    expect(result).toBe(latest)
    expect(repo.createOutboxEvent).not.toHaveBeenCalled()
  })

  it('attaches a run when identical event has no runId', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      id: 'fpe_existing',
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      organizationId: 'org_1',
      runId: null,
    }
    const run = { id: 'prn_attached' }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockImplementation(async (t) => {
      if (t === 'application') return profile() as never
      return {
        id: 'pmr_finance',
        revision: 1,
        financeDependency: 'none',
        financeScopes: [],
      } as never
    })
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createRunForEvent.mockResolvedValue(run as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const result = await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )
    expect(result).toEqual(run)
    expect(repo.createRunForEvent).toHaveBeenCalledOnce()
    expect(repo.updateOutboxEventRunId).toHaveBeenCalledWith(
      'fpe_existing',
      'prn_attached'
    )
  })

  it('enqueues REVOKED when embedded dependency is removed', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      desiredStatus: 'ACTIVE',
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      scopes: ['billing.customers.read'],
    }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockImplementation(async (t) => {
      if (t === 'application')
        return profile({
          revision: 3,
          financeDependency: 'none',
          financeScopes: [],
        }) as never
      return null
    })
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )) as Record<string, unknown>
    expect(event.desiredStatus).toBe('REVOKED')
    expect(event.provisioningVersion).toBe(3)
    expect(event.lifecycleVersion).toBe(2)
  })

  it('creates an app-owned run without finance event for direct application', async () => {
    const sub = subscription({ appId: 'rap_billing' })
    const prof = profile({ financeDependency: 'none', financeScopes: [] })
    const run = { id: 'prn_direct' }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app({ id: 'rap_billing' }))
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(prof as never)
    repo.findLatestOutboxEvent.mockResolvedValue(null)
    repo.createRunForApplication.mockResolvedValue({
      run: run as never,
      created: true,
    })

    const result = await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )
    expect(result).toBe(run)
    expect(repo.createRunForApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        appId: 'rap_billing',
        subscriptionId: 'sub_1',
        trigger: 'app_activation',
      })
    )
  })

  it('reuses existing direct run without counting change', async () => {
    const sub = subscription({ appId: 'rap_billing' })
    const prof = profile({ financeDependency: 'none', financeScopes: [] })
    const existing = { id: 'prn_direct' }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app({ id: 'rap_billing' }))
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(prof as never)
    repo.findLatestOutboxEvent.mockResolvedValue(null)
    repo.createRunForApplication.mockResolvedValue({
      run: existing as never,
      created: false,
    })

    const result = await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )
    expect(result).toBeNull()
  })

  it('suspends when app is inactive', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      desiredStatus: 'ACTIVE',
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      scopes: ['billing.customers.read'],
    }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app({ status: 'inactive' }))
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(
      profile({ financeScopes: ['billing.customers.read'] }) as never
    )
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )) as Record<string, unknown>
    expect(event.desiredStatus).toBe('SUSPENDED')
    expect(event.lifecycleVersion).toBe(2)
  })

  it('revokes when organization is deleted', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
    }
    const deletedOrg = org({ deletedAt: BigInt(1_700_000_100) })
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(deletedOrg)
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(
      profile({ financeScopes: ['billing.customers.read'] }) as never
    )
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never
    )) as Record<string, unknown>
    expect(event.desiredStatus).toBe('REVOKED')
  })

  it('another active subscription prevents revocation', async () => {
    const canceled = subscription({
      status: 'canceled',
      financeLifecycleVersion: 1,
    })
    const active = subscription({
      id: 'sub_2',
      status: 'active',
      financeLifecycleVersion: 1,
    })
    const latest = {
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
    }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(canceled as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([
      canceled as never,
      active as never,
    ])
    repo.findPublishedRevision.mockResolvedValue(
      profile({ financeScopes: ['billing.customers.read'] }) as never
    )
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    // Already matches? No, because latest entitlement is sub_1 but active is sub_2, so new event needed
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      canceled as never
    )) as Record<string, unknown>
    expect(event.desiredStatus).toBe('ACTIVE')
    expect(event.entitlementReference).toBe('sub_2')
    expect(event.lifecycleVersion).toBe(2)
    expect(repo.updateSubscriptionsLifecycleVersion).toHaveBeenCalledWith(
      ['sub_1', 'sub_2'],
      2
    )
  })

  it('returns null when subscription is gone', async () => {
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(null)
    const result = await enqueueFinanceConnectionEvent(
      { repository: repo },
      subscription() as never
    )
    expect(result).toBeNull()
  })

  it('throws when organization missing', async () => {
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(subscription() as never)
    repo.findOrganizationById.mockResolvedValue(null)
    await expect(
      enqueueFinanceConnectionEvent(
        { repository: repo },
        subscription() as never
      )
    ).rejects.toThrow('references missing organization')
  })

  it('throws when app missing', async () => {
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(subscription() as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(null)
    await expect(
      enqueueFinanceConnectionEvent(
        { repository: repo },
        subscription() as never
      )
    ).rejects.toThrow('references missing app')
  })

  it('respects desiredStatus override to REVOKED', async () => {
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
    }
    const repo = makeRepository()
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(profile() as never)
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const event = (await enqueueFinanceConnectionEvent(
      { repository: repo },
      sub as never,
      { desiredStatus: 'REVOKED' }
    )) as Record<string, unknown>
    expect(event.desiredStatus).toBe('REVOKED')
  })
})

describe('reconcileFinanceConnections', () => {
  it('examines and counts a new direct run as changed', async () => {
    const sub = subscription({ appId: 'rap_billing' })
    const repo = makeRepository()
    repo.listSubscriptionsForReconcile.mockResolvedValue({
      rows: [sub as never],
      hasMore: false,
    })
    // Mock enqueue path: make the underlying enqueue return a run
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app({ id: 'rap_billing' }))
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockResolvedValue(
      profile({ financeDependency: 'none', financeScopes: [] }) as never
    )
    repo.findLatestOutboxEvent.mockResolvedValue(null)
    repo.createRunForApplication.mockResolvedValue({
      run: { id: 'prn_direct' } as never,
      created: true,
    })

    const result = await reconcileFinanceConnections(
      { repository: repo },
      { trigger: 'manual_reconcile' }
    )
    expect(result.examined).toBe(1)
    expect(result.changed).toBe(1)
    expect(result.nextCursor).toBeNull()
  })

  it('counts an attached run as changed', async () => {
    // Two subscriptions: second iteration returns attached run via duplicated logic.
    // Instead mock enqueue indirectly: we drive reconcile by stubbing the underlying repo
    // to produce the branch where finance event already existed with null runId.
    const sub = subscription({ financeLifecycleVersion: 1 })
    const latest = {
      id: 'fpe_existing',
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      organizationId: 'org_1',
      runId: null,
    }
    const repo = makeRepository()
    repo.listSubscriptionsForReconcile.mockResolvedValue({
      rows: [sub as never],
      hasMore: false,
    })
    repo.findSubscriptionById.mockResolvedValue(sub as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([sub as never])
    repo.findPublishedRevision.mockImplementation(async (t) => {
      if (t === 'application') return profile() as never
      return {
        id: 'pmr_fin',
        revision: 1,
        financeDependency: 'none',
        financeScopes: [],
      } as never
    })
    repo.findLatestOutboxEvent.mockResolvedValue(latest as never)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_attached' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    const result = await reconcileFinanceConnections(
      { repository: repo },
      { trigger: 'manual_reconcile' }
    )
    expect(result.examined).toBe(1)
    expect(result.changed).toBe(1)
  })

  it('propagates paging cursor when hasMore', async () => {
    const a = subscription({ id: 'sub_1' })
    const b = subscription({ id: 'sub_2' })
    const repo = makeRepository()
    repo.listSubscriptionsForReconcile.mockResolvedValue({
      rows: [a as never, b as never],
      hasMore: true,
    })
    // Make both enqueue no-ops (identical retry)
    repo.findSubscriptionById.mockResolvedValue(a as never)
    repo.findOrganizationById.mockResolvedValue(org())
    repo.findAppById.mockResolvedValue(app())
    repo.listSubscriptionsByOrgAndApp.mockResolvedValue([a as never])
    repo.findPublishedRevision.mockResolvedValue(profile() as never)
    repo.findLatestOutboxEvent.mockResolvedValue({
      desiredStatus: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
      provisioningVersion: 2,
      lifecycleVersion: 1,
      sourceAppId: 'rap_couriers',
      entitlementReference: 'sub_1',
      runId: 'prn_1',
    } as never)

    // The event the run attaches to is the one just created; without this the
    // reconcile reads `organizationId` off undefined.
    repo.createOutboxEvent.mockImplementation(async (data) => data as never)
    repo.updateSubscriptionsLifecycleVersion.mockResolvedValue(undefined)
    repo.createRunForEvent.mockResolvedValue({ id: 'prn_1' } as never)
    repo.updateOutboxEventRunId.mockResolvedValue(undefined)

    // Second iteration will re-resolve with b; stub to return b
    let call = 0
    repo.findSubscriptionById.mockImplementation(async (id: string) => {
      call += 1
      return (call === 1 ? a : b) as never
    })
    repo.listSubscriptionsByOrgAndApp.mockImplementation(async () => [
      b as never,
    ])

    const result = await reconcileFinanceConnections(
      { repository: repo },
      { limit: 2 }
    )
    expect(result.nextCursor).toBe('sub_2')
  })

  it('forwards appId and organizationId filters to repository', async () => {
    const repo = makeRepository()
    repo.listSubscriptionsForReconcile.mockResolvedValue({
      rows: [],
      hasMore: false,
    })

    await reconcileFinanceConnections(
      { repository: repo },
      {
        appId: 'rap_1',
        organizationId: 'org_1',
        limit: 10,
        startingAfter: 'sub_0',
      }
    )

    expect(repo.listSubscriptionsForReconcile).toHaveBeenCalledWith({
      appId: 'rap_1',
      organizationId: 'org_1',
      limit: 10,
      startingAfter: 'sub_0',
    })
  })
})
