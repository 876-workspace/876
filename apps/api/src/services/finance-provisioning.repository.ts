import { prisma } from '@/db/client'

import type {
  AppRow,
  FinanceProvisioningOutboxRow,
  FinanceProvisioningRepository,
  OrganizationRow,
  ProvisioningManifestRevisionRow,
  ProvisioningRunRow,
  SubscriptionRow,
} from './finance-provisioning'

function toSubscriptionRow(row: {
  id: string
  organizationId: string
  appId: string
  status: string
  financeLifecycleVersion: number
}): SubscriptionRow {
  return row
}

export function createFinanceProvisioningRepository(): FinanceProvisioningRepository {
  return {
    async findSubscriptionById(id) {
      const row = await prisma.subscription.findUnique({
        where: { id },
        select: {
          id: true,
          organizationId: true,
          appId: true,
          status: true,
          financeLifecycleVersion: true,
        },
      })
      return row ? toSubscriptionRow(row) : null
    },

    async findOrganizationById(id) {
      const row = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          status: true,
          countryCode: true,
          currencyCode: true,
          deletedAt: true,
        },
      })
      return row as OrganizationRow | null
    },

    async findAppById(id) {
      const row = await prisma.app.findUnique({
        where: { id },
        select: { id: true, status: true, deletedAt: true },
      })
      return row as AppRow | null
    },

    async listSubscriptionsByOrgAndApp(organizationId, appId) {
      const rows = await prisma.subscription.findMany({
        where: { organizationId, appId },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          organizationId: true,
          appId: true,
          status: true,
          financeLifecycleVersion: true,
        },
      })
      return rows.map(toSubscriptionRow)
    },

    async findPublishedRevision(targetType, targetKey) {
      const row = await prisma.provisioningManifestRevision.findFirst({
        where: {
          status: 'published',
          provisioningManifest: { targetType, targetKey },
        },
        select: {
          id: true,
          revision: true,
          financeDependency: true,
          financeScopes: true,
        },
      })
      if (!row) return null
      return {
        id: row.id,
        revision: row.revision,
        financeDependency: row.financeDependency,
        financeScopes: [...row.financeScopes],
      } as ProvisioningManifestRevisionRow
    },

    async findLatestOutboxEvent(aggregateId) {
      const row = await prisma.financeProvisioningOutbox.findFirst({
        where: { aggregateId },
        orderBy: { lifecycleVersion: 'desc' },
      })
      return (row as FinanceProvisioningOutboxRow | null) ?? null
    },

    async createOutboxEvent(data) {
      const row = await prisma.financeProvisioningOutbox.create({ data })
      return row as FinanceProvisioningOutboxRow
    },

    async updateOutboxEventRunId(eventId, runId) {
      await prisma.financeProvisioningOutbox.update({
        where: { id: eventId },
        data: { runId },
      })
    },

    async updateSubscriptionsLifecycleVersion(
      subscriptionIds,
      lifecycleVersion
    ) {
      if (subscriptionIds.length === 0) return
      await prisma.subscription.updateMany({
        where: { id: { in: subscriptionIds } },
        data: { financeLifecycleVersion: lifecycleVersion },
      })
    },

    async createRunForApplication(params) {
      const existing = await prisma.provisioningRun.findFirst({
        where: {
          subscriptionId: params.subscriptionId,
          appId: params.appId,
          applicationRevisionId: params.applicationRevision.id,
          outboxEventId: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })

      if (existing) {
        return { run: existing as ProvisioningRunRow, created: false }
      }

      const { generateId } = await import('@/platform/ids')
      const nowBigint = BigInt(params.now)
      const runId = generateId('provisioningRun')

      const run = await prisma.provisioningRun.create({
        data: {
          id: runId,
          organizationId: params.organizationId,
          appId: params.appId,
          subscriptionId: params.subscriptionId,
          outboxEventId: null,
          trigger: params.trigger,
          status: 'queued',
          manifestVersion: 1,
          financeRevisionId: null,
          financeRevision: null,
          applicationRevisionId: params.applicationRevision.id,
          applicationRevision: params.applicationRevision.revision,
          attemptCount: 0,
          availableAt: nowBigint,
          startedAt: null,
          completedAt: null,
          lastError: null,
          createdAt: nowBigint,
          updatedAt: nowBigint,
        },
      })

      // Create run steps from the revision — at least one step even when the
      // revision has none, matching the Python `create_for_application`.
      const steps: unknown[] =
        (params.applicationRevision as unknown as { steps?: unknown[] })
          .steps ?? []
      const position = 0

      if (steps.length === 0) {
        await prisma.provisioningRunStep.create({
          data: {
            id: generateId('provisioningRunStep'),
            runId: run.id,
            targetType: 'application',
            targetKey: params.appId,
            revisionId: params.applicationRevision.id,
            revision: params.applicationRevision.revision,
            stepKey: 'apply_defaults',
            description:
              'Apply application defaults without replacing tenant overrides.',
            position,
            status: 'queued',
            attemptCount: 0,
            startedAt: null,
            completedAt: null,
            lastError: null,
            createdAt: nowBigint,
            updatedAt: nowBigint,
          },
        })
      }

      return { run: run as ProvisioningRunRow, created: true }
    },

    async createRunForEvent(params) {
      const existing = await prisma.provisioningRun.findFirst({
        where: { outboxEventId: params.outboxEventId },
      })
      if (existing) return existing as ProvisioningRunRow

      const { generateId } = await import('@/platform/ids')
      const nowBigint = BigInt(params.now)
      const runId = generateId('provisioningRun')

      const run = await prisma.provisioningRun.create({
        data: {
          id: runId,
          organizationId: params.organizationId,
          appId: params.appId,
          subscriptionId: params.subscriptionId,
          outboxEventId: params.outboxEventId,
          trigger: params.trigger,
          status: 'queued',
          manifestVersion: 1,
          financeRevisionId: params.financeRevision?.id ?? null,
          financeRevision: params.financeRevision?.revision ?? null,
          applicationRevisionId: params.applicationRevision?.id ?? null,
          applicationRevision: params.applicationRevision?.revision ?? null,
          attemptCount: 0,
          availableAt: nowBigint,
          startedAt: null,
          completedAt: null,
          lastError: null,
          createdAt: nowBigint,
          updatedAt: nowBigint,
        },
      })

      return run as ProvisioningRunRow
    },

    async listSubscriptionsForReconcile(params) {
      const where: Record<string, unknown> = {}
      if (params.appId) where.appId = params.appId
      if (params.organizationId) where.organizationId = params.organizationId
      if (params.startingAfter) {
        where.id = { gt: params.startingAfter }
      }

      const limit = params.limit
      const take = limit != null ? limit + 1 : undefined

      const rows = await prisma.subscription.findMany({
        where,
        orderBy: { id: 'asc' },
        take,
        select: {
          id: true,
          organizationId: true,
          appId: true,
          status: true,
          financeLifecycleVersion: true,
        },
      })

      const hasMore = limit != null && rows.length > limit
      const sliced = limit != null ? rows.slice(0, limit) : rows

      return {
        rows: sliced.map(toSubscriptionRow),
        hasMore,
      }
    },
  }
}
