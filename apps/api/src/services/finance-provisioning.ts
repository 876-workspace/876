import { generateId, normalizeSlug } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

export const FINANCE_EVENT_TYPE = 'finance_connection.ensure'
export const FINANCE_EVENT_CONTRACT_VERSION = 1

const ACTIVE_SUBSCRIPTION_STATES = new Set(['active', 'trialing'])
const REVOKED_SUBSCRIPTION_STATES = new Set(['canceled', 'incomplete_expired'])

export type FinanceConnectionStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
export type ProvisioningRunTrigger =
  | 'app_activation'
  | 'manifest_publish'
  | 'manual_reconcile'
  | 'retry'

export type SubscriptionRow = {
  id: string
  organizationId: string
  appId: string
  status: string
  financeLifecycleVersion: number
}

export type OrganizationRow = {
  id: string
  name: string | null
  shortName: string | null
  slug: string
  status: string
  countryCode: string | null
  currencyCode: string | null
  deletedAt: bigint | null
}

export type AppRow = {
  id: string
  status: string
  deletedAt: bigint | null
}

export type ProvisioningManifestRevisionRow = {
  id: string
  revision: number
  financeDependency: string
  financeScopes: string[]
  steps?: unknown[]
}

export type FinanceProvisioningOutboxRow = {
  id: string
  eventType: string
  contractVersion: number
  aggregateId: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  organizationCountryCode: string | null
  organizationCurrencyCode: string
  sourceAppId: string
  entitlementReference: string
  provisioningVersion: number
  lifecycleVersion: number
  desiredStatus: string
  scopes: string[]
  occurredAt: bigint
  status: string
  attemptCount: number
  availableAt: bigint
  lockedAt: bigint | null
  deliveredAt: bigint | null
  lastError: string | null
  createdAt: bigint
  updatedAt: bigint
  runId: string | null
}

export type ProvisioningRunRow = {
  id: string
  organizationId?: string
  appId?: string
  subscriptionId?: string | null
  outboxEventId?: string | null
  trigger?: string
  status?: string
}

export type FinanceProvisioningRepository = {
  findSubscriptionById(id: string): Promise<SubscriptionRow | null>
  findOrganizationById(id: string): Promise<OrganizationRow | null>
  findAppById(id: string): Promise<AppRow | null>
  listSubscriptionsByOrgAndApp(
    organizationId: string,
    appId: string
  ): Promise<SubscriptionRow[]>
  findPublishedRevision(
    targetType: string,
    targetKey: string
  ): Promise<ProvisioningManifestRevisionRow | null>
  findLatestOutboxEvent(
    aggregateId: string
  ): Promise<FinanceProvisioningOutboxRow | null>
  createOutboxEvent(
    data: Omit<FinanceProvisioningOutboxRow, 'runId'> & { runId: string | null }
  ): Promise<FinanceProvisioningOutboxRow>
  updateOutboxEventRunId(eventId: string, runId: string): Promise<void>
  updateSubscriptionsLifecycleVersion(
    subscriptionIds: string[],
    lifecycleVersion: number
  ): Promise<void>
  createRunForApplication(params: {
    organizationId: string
    appId: string
    subscriptionId: string
    trigger: ProvisioningRunTrigger
    applicationRevision: ProvisioningManifestRevisionRow
    now: number
  }): Promise<{ run: ProvisioningRunRow; created: boolean }>
  createRunForEvent(params: {
    organizationId: string
    appId: string
    subscriptionId: string | null
    outboxEventId: string
    trigger: ProvisioningRunTrigger
    financeRevision: ProvisioningManifestRevisionRow | null
    applicationRevision: ProvisioningManifestRevisionRow | null
    now: number
  }): Promise<ProvisioningRunRow>
  listSubscriptionsForReconcile(params: {
    appId?: string | null
    organizationId?: string | null
    limit?: number | null
    startingAfter?: string | null
  }): Promise<{ rows: SubscriptionRow[]; hasMore: boolean }>
}

export type FinanceProvisioningDeps = {
  repository: FinanceProvisioningRepository
}

export function desiredFinanceConnectionStatus(
  subscriptionStatus: string
): FinanceConnectionStatus {
  const normalized = subscriptionStatus.trim().toLowerCase()
  if (ACTIVE_SUBSCRIPTION_STATES.has(normalized)) return 'ACTIVE'
  if (REVOKED_SUBSCRIPTION_STATES.has(normalized)) return 'REVOKED'
  return 'SUSPENDED'
}

export function financeWorkspaceName(organization: OrganizationRow): string {
  for (const candidate of [
    organization.name,
    organization.shortName,
    organization.slug,
  ]) {
    const value = candidate?.trim() ?? ''
    if (value) return value.slice(0, 160)
  }
  return organization.id.slice(0, 160)
}

export function financeWorkspaceSlug(organization: OrganizationRow): string {
  const value = normalizeSlug(organization.slug)
    .slice(0, 80)
    .replace(/-+$/g, '')
  if (value.length >= 2) return value
  const suffix = normalizeSlug(organization.id).slice(-8)
  return `${value || 'org'}-${suffix}`.slice(0, 80)
}

function effectiveSubscriptionState(subscriptions: SubscriptionRow[]): {
  status: FinanceConnectionStatus
  entitlementReference: string
} {
  const active = subscriptions.filter((row) =>
    ACTIVE_SUBSCRIPTION_STATES.has(row.status.trim().toLowerCase())
  )
  if (active.length > 0) {
    return { status: 'ACTIVE', entitlementReference: active[0]!.id }
  }

  const suspended = subscriptions.filter(
    (row) => !REVOKED_SUBSCRIPTION_STATES.has(row.status.trim().toLowerCase())
  )
  if (suspended.length > 0) {
    return { status: 'SUSPENDED', entitlementReference: suspended[0]!.id }
  }

  if (subscriptions.length > 0) {
    return { status: 'REVOKED', entitlementReference: subscriptions[0]!.id }
  }

  throw new Error(
    'A finance connection cannot be derived without a subscription.'
  )
}

function eventMatches(
  event: FinanceProvisioningOutboxRow,
  params: {
    desiredStatus: string
    scopes: string[]
    provisioningRevision: number
    sourceAppId: string
    entitlementReference: string
  }
): boolean {
  return (
    event.desiredStatus === params.desiredStatus &&
    arraysEqual(event.scopes, params.scopes) &&
    event.provisioningVersion === params.provisioningRevision &&
    event.sourceAppId === params.sourceAppId &&
    event.entitlementReference === params.entitlementReference
  )
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function attachRun(
  repository: FinanceProvisioningRepository,
  event: FinanceProvisioningOutboxRow,
  params: {
    subscriptionId: string | null
    applicationRevision: ProvisioningManifestRevisionRow | null
    trigger: ProvisioningRunTrigger
    now: number
  }
): Promise<ProvisioningRunRow> {
  const financeRevision = await repository.findPublishedRevision(
    'finance',
    'shared'
  )
  const run = await repository.createRunForEvent({
    organizationId: event.organizationId,
    appId: event.sourceAppId,
    subscriptionId: params.subscriptionId,
    outboxEventId: event.id,
    trigger: params.trigger,
    financeRevision,
    applicationRevision: params.applicationRevision,
    now: params.now,
  })
  await repository.updateOutboxEventRunId(event.id, run.id)
  // Keep in-memory row consistent so callers see the linkage without a reload.
  event.runId = run.id
  return run
}

export async function enqueueFinanceConnectionEvent(
  deps: FinanceProvisioningDeps,
  subscription: SubscriptionRow,
  options: {
    desiredStatus?: FinanceConnectionStatus | null
    trigger?: ProvisioningRunTrigger
  } = {}
): Promise<FinanceProvisioningOutboxRow | ProvisioningRunRow | null> {
  const trigger = options.trigger ?? 'app_activation'
  const desiredStatus = options.desiredStatus ?? null

  const locked = await deps.repository.findSubscriptionById(subscription.id)
  if (!locked) return null

  const organization = await deps.repository.findOrganizationById(
    locked.organizationId
  )
  if (!organization) {
    throw new Error(
      `Subscription ${locked.id} references missing organization ${locked.organizationId}.`
    )
  }

  const sourceApp = await deps.repository.findAppById(locked.appId)
  if (!sourceApp) {
    throw new Error(
      `Subscription ${locked.id} references missing app ${locked.appId}.`
    )
  }

  const connectionAggregateId = `${locked.organizationId}:${locked.appId}`
  const subscriptions = await deps.repository.listSubscriptionsByOrgAndApp(
    locked.organizationId,
    locked.appId
  )

  const profile = await deps.repository.findPublishedRevision(
    'application',
    locked.appId
  )
  const latest = await deps.repository.findLatestOutboxEvent(
    connectionAggregateId
  )

  if (!profile || profile.financeDependency === 'none') {
    if (!latest) {
      if (profile) {
        const { run, created } = await deps.repository.createRunForApplication({
          organizationId: organization.id,
          appId: locked.appId,
          subscriptionId: locked.id,
          trigger,
          applicationRevision: profile,
          now: nowUnixSeconds(),
        })
        return created ? run : null
      }
      return null
    }

    const nextStatus: FinanceConnectionStatus = 'REVOKED'
    const scopes = [...latest.scopes]
    const provisioningRevision = profile
      ? profile.revision
      : latest.provisioningVersion
    const entitlementReference = latest.entitlementReference

    if (
      latest &&
      eventMatches(latest, {
        desiredStatus: nextStatus,
        scopes,
        provisioningRevision,
        sourceAppId: locked.appId,
        entitlementReference,
      })
    ) {
      if (latest.runId == null) {
        return attachRun(deps.repository, latest, {
          subscriptionId: entitlementReference,
          applicationRevision: profile,
          trigger,
          now: nowUnixSeconds(),
        })
      }
      return latest
    }

    const now = nowUnixSeconds()
    const lifecycleVersion = latest ? latest.lifecycleVersion + 1 : 1
    await deps.repository.updateSubscriptionsLifecycleVersion(
      subscriptions.map((s) => s.id),
      lifecycleVersion
    )
    for (const candidate of subscriptions) {
      candidate.financeLifecycleVersion = lifecycleVersion
    }

    const event = await deps.repository.createOutboxEvent({
      id: generateId('financeProvisioningEvent'),
      eventType: FINANCE_EVENT_TYPE,
      contractVersion: FINANCE_EVENT_CONTRACT_VERSION,
      aggregateId: connectionAggregateId,
      organizationId: organization.id,
      organizationName: financeWorkspaceName(organization),
      organizationSlug: financeWorkspaceSlug(organization),
      organizationCountryCode: organization.countryCode ?? null,
      organizationCurrencyCode: (
        organization.currencyCode ?? 'JMD'
      ).toUpperCase(),
      sourceAppId: locked.appId,
      entitlementReference,
      provisioningVersion: provisioningRevision,
      lifecycleVersion,
      desiredStatus: nextStatus,
      scopes,
      occurredAt: BigInt(now),
      status: 'pending',
      attemptCount: 0,
      availableAt: BigInt(now),
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
      runId: null,
    })

    await attachRun(deps.repository, event, {
      subscriptionId: entitlementReference,
      applicationRevision: profile,
      trigger,
      now,
    })

    return event
  }

  // Embedded finance path
  const scopes = [...new Set(profile.financeScopes)].sort()
  const provisioningRevision = profile.revision
  // Resolved once: `nextStatus` is reassigned below, the reference is not.
  const state = effectiveSubscriptionState(subscriptions)
  const { entitlementReference } = state
  let nextStatus = state.status

  if (
    desiredStatus === 'REVOKED' ||
    organization.deletedAt !== null ||
    sourceApp.deletedAt !== null
  ) {
    nextStatus = 'REVOKED'
  } else if (desiredStatus !== null) {
    nextStatus = desiredStatus
  } else if (
    organization.status !== 'active' ||
    sourceApp.status !== 'active'
  ) {
    nextStatus = 'SUSPENDED'
  }

  if (
    latest &&
    eventMatches(latest, {
      desiredStatus: nextStatus,
      scopes,
      provisioningRevision,
      sourceAppId: locked.appId,
      entitlementReference,
    })
  ) {
    if (latest.runId == null) {
      return attachRun(deps.repository, latest, {
        subscriptionId: entitlementReference,
        applicationRevision: profile,
        trigger,
        now: nowUnixSeconds(),
      })
    }
    return latest
  }

  const now = nowUnixSeconds()
  const lifecycleVersion = latest ? latest.lifecycleVersion + 1 : 1
  await deps.repository.updateSubscriptionsLifecycleVersion(
    subscriptions.map((s) => s.id),
    lifecycleVersion
  )
  for (const candidate of subscriptions) {
    candidate.financeLifecycleVersion = lifecycleVersion
  }

  const event = await deps.repository.createOutboxEvent({
    id: generateId('financeProvisioningEvent'),
    eventType: FINANCE_EVENT_TYPE,
    contractVersion: FINANCE_EVENT_CONTRACT_VERSION,
    aggregateId: connectionAggregateId,
    organizationId: organization.id,
    organizationName: financeWorkspaceName(organization),
    organizationSlug: financeWorkspaceSlug(organization),
    organizationCountryCode: organization.countryCode ?? null,
    organizationCurrencyCode: (
      organization.currencyCode ?? 'JMD'
    ).toUpperCase(),
    sourceAppId: locked.appId,
    entitlementReference,
    provisioningVersion: provisioningRevision,
    lifecycleVersion,
    desiredStatus: nextStatus,
    scopes,
    occurredAt: BigInt(now),
    status: 'pending',
    attemptCount: 0,
    availableAt: BigInt(now),
    lockedAt: null,
    deliveredAt: null,
    lastError: null,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
    runId: null,
  })

  await attachRun(deps.repository, event, {
    subscriptionId: entitlementReference,
    applicationRevision: profile,
    trigger,
    now,
  })

  return event
}

export async function reconcileFinanceConnections(
  deps: FinanceProvisioningDeps,
  options: {
    appId?: string | null
    organizationId?: string | null
    limit?: number | null
    startingAfter?: string | null
    desiredStatus?: FinanceConnectionStatus | null
    trigger?: ProvisioningRunTrigger
  } = {}
): Promise<{ examined: number; changed: number; nextCursor: string | null }> {
  const limit = options.limit === undefined ? 1000 : options.limit
  const trigger = options.trigger ?? 'app_activation'

  const { rows, hasMore } = await deps.repository.listSubscriptionsForReconcile(
    {
      appId: options.appId ?? null,
      organizationId: options.organizationId ?? null,
      limit,
      startingAfter: options.startingAfter ?? null,
    }
  )

  let changed = 0
  for (const subscription of rows) {
    const before = subscription.financeLifecycleVersion
    const result = await enqueueFinanceConnectionEvent(deps, subscription, {
      desiredStatus: options.desiredStatus ?? null,
      trigger,
    })

    const isProvisioningRun =
      result !== null &&
      typeof result === 'object' &&
      'id' in result &&
      !('aggregateId' in result)

    if (subscription.financeLifecycleVersion !== before || isProvisioningRun) {
      changed += 1
    }
  }

  const nextCursor =
    hasMore && rows.length > 0 ? rows[rows.length - 1]!.id : null
  return { examined: rows.length, changed, nextCursor }
}

export function financeEventPayload(
  event: FinanceProvisioningOutboxRow
): Record<string, unknown> {
  return {
    eventId: event.id,
    eventType: event.eventType,
    contractVersion: event.contractVersion,
    aggregateId: event.aggregateId,
    organization: {
      id: event.organizationId,
      name: event.organizationName,
      slug: event.organizationSlug,
      countryCode: event.organizationCountryCode,
      currencyCode: event.organizationCurrencyCode,
    },
    sourceAppId: event.sourceAppId,
    entitlementReference: event.entitlementReference,
    manifestVersion: 1,
    provisioningRevision: event.provisioningVersion,
    lifecycleVersion: event.lifecycleVersion,
    desiredStatus: event.desiredStatus,
    scopes: [...event.scopes],
    occurredAt: Number(event.occurredAt),
  }
}
