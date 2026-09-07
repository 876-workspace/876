import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { AccountingResourceType } from '@/providers/accounting'

const LOCK_TIMEOUT_SECONDS = 5 * 60

export async function claimAccountingSyncJobs(now: number, limit: number) {
  return prisma.$transaction(async (tx) => {
    const ids = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM billing_accounting_provider_sync_jobs
      WHERE (
        status IN ('pending', 'failed')
        OR (status = 'processing' AND locked_at <= ${now - LOCK_TIMEOUT_SECONDS})
      )
        AND available_at <= ${now}
      ORDER BY
        CASE resource_type
          WHEN 'customer' THEN 0
          WHEN 'item' THEN 1
          WHEN 'estimate' THEN 2
          WHEN 'invoice' THEN 3
          WHEN 'recurring-invoice' THEN 4
          WHEN 'payment' THEN 5
          ELSE 9
        END,
        created_at,
        id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`

    if (!ids.length) return []
    const jobIds = ids.map(({ id }) => id)
    await tx.accountingProviderSyncJob.updateMany({
      where: { id: { in: jobIds } },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
        lockedAt: now,
        lastErrorCode: null,
        lastError: null,
        updatedAt: now,
      },
    })
    const rows = await tx.accountingProviderSyncJob.findMany({
      where: { id: { in: jobIds } },
      include: { connection: { include: { provider: true } } },
    })
    const byId = new Map(rows.map((row) => [row.id, row]))
    return jobIds.flatMap((id) => {
      const row = byId.get(id)
      return row ? [row] : []
    })
  })
}

export function markAccountingSyncDelivered(
  id: string,
  generation: number,
  now: number
) {
  return prisma.accountingProviderSyncJob.updateMany({
    where: { id, generation, status: 'processing' },
    data: {
      status: 'delivered',
      deliveredAt: now,
      lockedAt: null,
      lastErrorCode: null,
      lastError: null,
      updatedAt: now,
    },
  })
}

export function markAccountingSyncFailed(params: {
  id: string
  generation: number
  attemptCount: number
  code: string
  message: string
  retryable: boolean
  now: number
}) {
  const delay = Math.min(3600, 5 * 2 ** Math.min(params.attemptCount, 10))
  return prisma.accountingProviderSyncJob.updateMany({
    where: {
      id: params.id,
      generation: params.generation,
      status: 'processing',
    },
    data: {
      status: params.retryable ? 'failed' : 'blocked',
      availableAt: params.retryable ? params.now + delay : params.now,
      lockedAt: null,
      lastErrorCode: params.code,
      lastError: params.message.slice(0, 2000),
      updatedAt: params.now,
    },
  })
}

export function findAccountingReference(
  connectionId: string,
  resourceType: AccountingResourceType,
  resourceId: string
) {
  return prisma.providerReference.findFirst({
    where: {
      accountingProviderConnectionId: connectionId,
      resourceType,
      resourceId,
    },
    select: { id: true, externalId: true, externalType: true },
  })
}

export function removeAccountingReference(
  connectionId: string,
  resourceType: AccountingResourceType,
  resourceId: string
) {
  return prisma.providerReference.deleteMany({
    where: {
      accountingProviderConnectionId: connectionId,
      resourceType,
      resourceId,
    },
  })
}

export async function upsertAccountingReference(params: {
  tenantId: string
  connectionId: string
  provider: string
  resourceType: AccountingResourceType
  resourceId: string
  externalType: string
  externalId: string
  now: number
}) {
  const id = generateId('ProviderReference')
  await prisma.$executeRaw`
    INSERT INTO billing_provider_references (
      id, tenant_id, provider, provider_connection_id,
      accounting_provider_connection_id, resource_type, resource_id,
      external_type, external_id, metadata, created_at
    ) VALUES (
      ${id}, ${params.tenantId}, ${params.provider}, NULL,
      ${params.connectionId}, ${params.resourceType}, ${params.resourceId},
      ${params.externalType}, ${params.externalId}, NULL, ${params.now}
    )
    ON CONFLICT (accounting_provider_connection_id, resource_type, resource_id)
      WHERE accounting_provider_connection_id IS NOT NULL
    DO UPDATE SET
      provider = EXCLUDED.provider,
      external_type = EXCLUDED.external_type,
      external_id = EXCLUDED.external_id`
}

export function markAccountingConnectionSyncSuccess(id: string, now: number) {
  return prisma.accountingProviderConnection.updateMany({
    where: { id, status: 'active' },
    data: {
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
      lastErrorCode: null,
      updatedAt: now,
    },
  })
}

export function markAccountingConnectionSyncFailure(
  id: string,
  code: string,
  terminalAuthorizationError: boolean,
  now: number
) {
  return prisma.accountingProviderConnection.updateMany({
    where: { id, status: { not: 'disabled' } },
    data: {
      ...(terminalAuthorizationError ? { status: 'error' } : {}),
      lastSyncedAt: now,
      lastErrorCode: code,
      updatedAt: now,
    },
  })
}

async function enqueueResourceType(
  tenantId: string,
  connectionId: string,
  resourceType: AccountingResourceType,
  now: number
) {
  switch (resourceType) {
    case 'customer':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':customer:' || id),
          tenant_id, ${connectionId}, 'customer', id, 'reconcile', 'pending',
          1, 0, ${now}, NULL, NULL, NULL, NULL, ${now}, ${now}
        FROM billing_customers WHERE tenant_id = ${tenantId}
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
    case 'item':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':item:' || id),
          tenant_id, ${connectionId}, 'item', id, 'reconcile', 'pending',
          1, 0, ${now}, NULL, NULL, NULL, NULL, ${now}, ${now}
        FROM billing_items WHERE tenant_id = ${tenantId}
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
    case 'estimate':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':estimate:' || id),
          tenant_id, ${connectionId}, 'estimate', id, 'reconcile', 'pending',
          1, 0, ${now}, NULL, NULL, NULL, NULL, ${now}, ${now}
        FROM billing_estimates WHERE tenant_id = ${tenantId}
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
    case 'invoice':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':invoice:' || id),
          tenant_id, ${connectionId}, 'invoice', id, 'reconcile', 'pending',
          1, 0, ${now}, NULL, NULL, NULL, NULL, ${now}, ${now}
        FROM billing_invoices WHERE tenant_id = ${tenantId}
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
    case 'recurring-invoice':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':recurring-invoice:' || id),
          tenant_id, ${connectionId}, 'recurring-invoice', id,
          'reconcile', 'pending', 1, 0, ${now}, NULL, NULL, NULL, NULL,
          ${now}, ${now}
        FROM billing_subscriptions
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
    case 'payment':
      return prisma.$executeRaw`
        INSERT INTO billing_accounting_provider_sync_jobs (
          id, tenant_id, connection_id, resource_type, resource_id,
          operation, status, generation, attempt_count, available_at,
          locked_at, delivered_at, last_error_code, last_error,
          created_at, updated_at
        )
        SELECT 'apsync_' || md5(${connectionId} || ':payment:' || id),
          tenant_id, ${connectionId}, 'payment', id, 'reconcile', 'pending',
          1, 0, ${now}, NULL, NULL, NULL, NULL, ${now}, ${now}
        FROM billing_payments WHERE tenant_id = ${tenantId}
        ON CONFLICT (connection_id, resource_type, resource_id) DO UPDATE SET
          operation = 'reconcile', status = 'pending',
          generation = billing_accounting_provider_sync_jobs.generation + 1,
          attempt_count = 0, available_at = EXCLUDED.available_at,
          locked_at = NULL, delivered_at = NULL, last_error_code = NULL,
          last_error = NULL, updated_at = EXCLUDED.updated_at`
  }
}

export async function enqueueConnectionResources(
  tenantId: string,
  connectionId: string,
  resourceTypes: AccountingResourceType[],
  now: number
) {
  let enqueued = 0
  for (const resourceType of resourceTypes)
    enqueued += await enqueueResourceType(
      tenantId,
      connectionId,
      resourceType,
      now
    )
  return enqueued
}

// Canonical row loaders for projection. The sync service maps these rows onto
// provider input shapes; only this repository may reach the database.

export function findProjectableCustomer(tenantId: string, id: string) {
  return prisma.customer.findFirst({ where: { tenantId, id } })
}

export function findProjectableItem(tenantId: string, id: string) {
  return prisma.item.findFirst({ where: { tenantId, id } })
}

export function findProjectableQuote(tenantId: string, id: string) {
  return prisma.quote.findFirst({
    where: { tenantId, id },
    include: { lines: { orderBy: { createdAt: 'asc' } } },
  })
}

export function findProjectableInvoice(tenantId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { tenantId, id },
    include: { lines: { orderBy: { position: 'asc' } } },
  })
}

export function findProjectableSubscription(tenantId: string, id: string) {
  return prisma.subscription.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        include: { price: { include: { item: true, plan: true } } },
      },
    },
  })
}

export function findProjectablePayment(tenantId: string, id: string) {
  return prisma.payment.findFirst({
    where: { tenantId, id },
    include: {
      paymentMode: true,
      invoiceAllocations: { where: { reversedAt: null } },
    },
  })
}
