import { getSettings } from '@/config'
import { prisma } from '@/db/client'
import { AppHttpError } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import {
  accountingProvider,
  accountingResourceTypes,
  type AccountingCustomerInput,
  type AccountingEstimateInput,
  type AccountingInvoiceInput,
  type AccountingItemInput,
  type AccountingPaymentInput,
  type AccountingRecurringInvoiceInput,
  type AccountingResourceType,
} from '@/providers/accounting'
import {
  ZohoBooksError,
  toZohoBooksError,
} from '@/providers/accounting/zoho-books/errors'

import { zohoAccessContext } from './accounting-providers.service'
import {
  claimAccountingSyncJobs,
  enqueueConnectionResources,
  findAccountingReference,
  markAccountingConnectionSyncFailure,
  markAccountingConnectionSyncSuccess,
  markAccountingSyncDelivered,
  markAccountingSyncFailed,
  removeAccountingReference,
  upsertAccountingReference,
} from './accounting-sync.repository'
import { findAccountingConnectionRow } from './accounting-providers.repository'

class AccountingDependencyError extends Error {
  readonly code = 'billing/accounting-dependency-pending'
  readonly retryable = true
}

class AccountingProjectionError extends Error {
  readonly code = 'billing/accounting-projection-invalid'
  readonly retryable = false
}

type LoadedResource =
  | { type: 'customer'; input: AccountingCustomerInput }
  | { type: 'item'; input: AccountingItemInput }
  | { type: 'estimate'; input: AccountingEstimateInput }
  | { type: 'invoice'; input: AccountingInvoiceInput }
  | { type: 'recurring-invoice'; input: AccountingRecurringInvoiceInput }
  | { type: 'payment'; input: AccountingPaymentInput }

async function externalId(
  connectionId: string,
  type: AccountingResourceType,
  id: string
) {
  const reference = await findAccountingReference(connectionId, type, id)
  if (!reference)
    throw new AccountingDependencyError(
      `Accounting dependency ${type}:${id} has not synced yet.`
    )
  return reference.externalId
}

async function loadResource(
  tenantId: string,
  connectionId: string,
  type: AccountingResourceType,
  id: string
): Promise<LoadedResource | null> {
  switch (type) {
    case 'customer': {
      const row = await prisma.customer.findFirst({ where: { tenantId, id } })
      if (!row) return null
      return {
        type,
        input: {
          id: row.id,
          name: row.name,
          companyName: row.companyName,
          email: row.email,
          phone: row.phone,
          status: row.status,
        },
      }
    }
    case 'item': {
      const row = await prisma.item.findFirst({ where: { tenantId, id } })
      if (!row) return null
      return {
        type,
        input: {
          id: row.id,
          name: row.name,
          sku: row.sku,
          unit: row.unit,
          description: row.description,
          type: row.type,
          amount: row.defaultSellingAmount,
          currency: row.defaultSellingCurrency,
          isTaxable: row.isTaxable,
          isActive: row.isActive,
        },
      }
    }
    case 'estimate': {
      const row = await prisma.estimate.findFirst({
        where: { tenantId, id },
        include: { lines: { orderBy: { createdAt: 'asc' } } },
      })
      if (!row) return null
      const providerCustomerId = await externalId(
        connectionId,
        'customer',
        row.customerId
      )
      return {
        type,
        input: {
          id: row.id,
          providerCustomerId,
          number: row.number,
          currency: row.currency,
          issueAt: row.issueAt,
          expiresAt: row.expiresAt,
          notes: row.notes,
          terms: row.terms,
          lines: await Promise.all(
            row.lines.map(async (line) => ({
              providerItemId: line.itemId
                ? (await findAccountingReference(connectionId, 'item', line.itemId))
                    ?.externalId ?? null
                : null,
              description: line.description,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              currency: row.currency,
            }))
          ),
        },
      }
    }
    case 'invoice': {
      const row = await prisma.invoice.findFirst({
        where: { tenantId, id },
        include: { lines: { orderBy: { position: 'asc' } } },
      })
      if (!row) return null
      const providerCustomerId = await externalId(
        connectionId,
        'customer',
        row.customerId
      )
      return {
        type,
        input: {
          id: row.id,
          providerCustomerId,
          number: row.number,
          currency: row.currency,
          issueAt: row.issueAt,
          dueAt: row.dueAt,
          referenceNumber: row.referenceNumber,
          notes: row.notes,
          terms: row.terms,
          lines: await Promise.all(
            row.lines.map(async (line) => ({
              providerItemId: line.itemId
                ? (await findAccountingReference(connectionId, 'item', line.itemId))
                    ?.externalId ?? null
                : null,
              description: line.description,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              currency: row.currency,
            }))
          ),
        },
      }
    }
    case 'recurring-invoice': {
      const row = await prisma.subscription.findFirst({
        where: { tenantId, id, deletedAt: null },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
            include: { price: { include: { item: true, plan: true } } },
          },
        },
      })
      if (!row || !['ACTIVE', 'TRIALING'].includes(row.status)) return null
      const providerCustomerId = await externalId(
        connectionId,
        'customer',
        row.customerId
      )
      const cadence = row.items.find(
        ({ price }) =>
          price.priceType === 'RECURRING' &&
          price.intervalUnit != null &&
          price.intervalCount != null
      )?.price
      if (!cadence?.intervalUnit || !cadence.intervalCount)
        throw new AccountingProjectionError(
          'A recurring Billing subscription needs a recurring price cadence before it can be projected.'
        )
      return {
        type,
        input: {
          id: row.id,
          providerCustomerId,
          name: row.externalReference ?? `876 ${row.id}`,
          currency: cadence.currency,
          startAt: row.startAt,
          endAt: row.expiresAt,
          intervalUnit: cadence.intervalUnit,
          intervalCount: cadence.intervalCount,
          lines: await Promise.all(
            row.items.map(async (item) => {
              const providerItemId = item.price.itemId
                ? (await findAccountingReference(
                    connectionId,
                    'item',
                    item.price.itemId
                  ))?.externalId ?? null
                : null
              const unitAmount = item.unitAmount ?? item.price.unitAmount
              if (unitAmount == null)
                throw new AccountingProjectionError(
                  `Subscription item ${item.id} has no fixed unit amount.`
                )
              return {
                providerItemId,
                description:
                  item.description ?? item.price.item?.name ?? `876 ${item.id}`,
                quantity: item.quantity,
                unitAmount,
                currency: item.currency ?? item.price.currency,
              }
            })
          ),
        },
      }
    }
    case 'payment': {
      const row = await prisma.payment.findFirst({
        where: { tenantId, id },
        include: {
          paymentMode: true,
          invoiceAllocations: { where: { reversedAt: null } },
        },
      })
      if (
        !row ||
        !['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(row.status)
      )
        return null
      const providerCustomerId = await externalId(
        connectionId,
        'customer',
        row.customerId
      )
      const allocations = await Promise.all(
        row.invoiceAllocations.map(async (allocation) => ({
          providerInvoiceId: await externalId(
            connectionId,
            'invoice',
            allocation.invoiceId
          ),
          amount: allocation.amount,
        }))
      )
      return {
        type,
        input: {
          id: row.id,
          providerCustomerId,
          amount: row.amount,
          currency: row.currency,
          paidAt: row.paymentDate,
          paymentMode: row.paymentMode.name,
          referenceNumber: row.referenceNumber,
          notes: row.notes,
          allocations,
        },
      }
    }
  }
}

function providerResource(
  providerKey: string,
  type: AccountingResourceType
) {
  const adapter = accountingProvider(providerKey)
  switch (type) {
    case 'customer':
      return adapter.customers
    case 'item':
      return adapter.items
    case 'estimate':
      return adapter.estimates
    case 'invoice':
      return adapter.invoices
    case 'recurring-invoice':
      return adapter.recurringInvoices
    case 'payment':
      return adapter.payments
  }
}

async function deleteExternal(
  connectionId: string,
  providerKey: string,
  type: AccountingResourceType,
  resourceId: string
) {
  const reference = await findAccountingReference(
    connectionId,
    type,
    resourceId
  )
  if (!reference) return
  const { ctx } = await zohoAccessContext(connectionId)
  try {
    await providerResource(providerKey, type).remove(ctx, reference.externalId)
  } catch (caught) {
    if (
      !(caught instanceof ZohoBooksError) ||
      caught.code !== 'billing/provider-resource-not-found'
    )
      throw caught
  }
  await removeAccountingReference(connectionId, type, resourceId)
}

async function writeLoaded(
  connectionId: string,
  providerKey: string,
  loaded: LoadedResource
) {
  const { ctx } = await zohoAccessContext(connectionId)
  const adapter = accountingProvider(providerKey)
  const reference = await findAccountingReference(
    connectionId,
    loaded.type,
    loaded.input.id
  )

  async function execute() {
    switch (loaded.type) {
      case 'customer': {
        const result = reference
          ? await adapter.customers.update(ctx, reference.externalId, loaded.input)
          : await adapter.customers.create(ctx, loaded.input)
        if (adapter.customers.setActive)
          await adapter.customers.setActive(
            ctx,
            result.externalId,
            loaded.input.status === 'ACTIVE'
          )
        return result
      }
      case 'item': {
        const result = reference
          ? await adapter.items.update(ctx, reference.externalId, loaded.input)
          : await adapter.items.create(ctx, loaded.input)
        if (adapter.items.setActive)
          await adapter.items.setActive(
            ctx,
            result.externalId,
            loaded.input.isActive
          )
        return result
      }
      case 'estimate':
        return reference
          ? adapter.estimates.update(ctx, reference.externalId, loaded.input)
          : adapter.estimates.create(ctx, loaded.input)
      case 'invoice':
        return reference
          ? adapter.invoices.update(ctx, reference.externalId, loaded.input)
          : adapter.invoices.create(ctx, loaded.input)
      case 'recurring-invoice':
        return reference
          ? adapter.recurringInvoices.update(ctx, reference.externalId, loaded.input)
          : adapter.recurringInvoices.create(ctx, loaded.input)
      case 'payment':
        return reference
          ? adapter.payments.update(ctx, reference.externalId, loaded.input)
          : adapter.payments.create(ctx, loaded.input)
    }
  }

  try {
    return await execute()
  } catch (caught) {
    if (
      reference &&
      caught instanceof ZohoBooksError &&
      caught.code === 'billing/provider-resource-not-found'
    ) {
      await removeAccountingReference(
        connectionId,
        loaded.type,
        loaded.input.id
      )
      switch (loaded.type) {
        case 'customer':
          return adapter.customers.create(ctx, loaded.input)
        case 'item':
          return adapter.items.create(ctx, loaded.input)
        case 'estimate':
          return adapter.estimates.create(ctx, loaded.input)
        case 'invoice':
          return adapter.invoices.create(ctx, loaded.input)
        case 'recurring-invoice':
          return adapter.recurringInvoices.create(ctx, loaded.input)
        case 'payment':
          return adapter.payments.create(ctx, loaded.input)
      }
    }
    throw caught
  }
}

async function processJob(
  job: Awaited<ReturnType<typeof claimAccountingSyncJobs>>[number]
) {
  const now = nowUnixSeconds()
  if (job.connection.status !== 'active') {
    await markAccountingSyncFailed({
      id: job.id,
      generation: job.generation,
      attemptCount: job.attemptCount,
      code: 'billing/accounting-connection-inactive',
      message: 'The accounting provider connection is not active.',
      retryable: false,
      now,
    })
    return 'blocked' as const
  }

  try {
    if (job.operation === 'delete') {
      await deleteExternal(
        job.connectionId,
        job.connection.provider.key,
        job.resourceType as AccountingResourceType,
        job.resourceId
      )
      await markAccountingSyncDelivered(job.id, job.generation, now)
      return 'succeeded' as const
    }

    const loaded = await loadResource(
      job.tenantId,
      job.connectionId,
      job.resourceType as AccountingResourceType,
      job.resourceId
    )
    if (!loaded) {
      await deleteExternal(
        job.connectionId,
        job.connection.provider.key,
        job.resourceType as AccountingResourceType,
        job.resourceId
      )
      await markAccountingSyncDelivered(job.id, job.generation, now)
      return 'skipped' as const
    }
    const result = await writeLoaded(
      job.connectionId,
      job.connection.provider.key,
      loaded
    )
    await upsertAccountingReference({
      tenantId: job.tenantId,
      connectionId: job.connectionId,
      provider: job.connection.provider.key,
      resourceType: loaded.type,
      resourceId: loaded.input.id,
      externalType: result.externalType,
      externalId: result.externalId,
      now,
    })
    await Promise.all([
      markAccountingSyncDelivered(job.id, job.generation, now),
      markAccountingConnectionSyncSuccess(job.connectionId, now),
    ])
    return 'succeeded' as const
  } catch (caught) {
    const providerError =
      caught instanceof AccountingDependencyError ||
      caught instanceof AccountingProjectionError
        ? caught
        : toZohoBooksError(caught)
    const retryable = providerError.retryable
    const code = providerError.code
    const message = providerError.message
    await Promise.all([
      markAccountingSyncFailed({
        id: job.id,
        generation: job.generation,
        attemptCount: job.attemptCount,
        code,
        message,
        retryable,
        now,
      }),
      markAccountingConnectionSyncFailure(
        job.connectionId,
        code,
        code === 'billing/provider-authorization-required',
        now
      ),
    ])
    return retryable ? ('failed' as const) : ('blocked' as const)
  }
}

export async function runAccountingSync(limit?: number) {
  if (!getSettings().features.accountingProviderSync)
    return {
      object: 'accounting-sync-run' as const,
      claimed: 0,
      succeeded: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      disabled: true,
    }

  const batchSize = Math.max(
    1,
    Math.min(limit ?? getSettings().accountingProviderSyncBatchSize, 100)
  )
  const jobs = await claimAccountingSyncJobs(nowUnixSeconds(), batchSize)
  const result = {
    object: 'accounting-sync-run' as const,
    claimed: jobs.length,
    succeeded: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    disabled: false,
  }
  for (const job of jobs) result[await processJob(job)] += 1
  return result
}

export async function reconcileAccountingConnection(params: {
  tenantId: string
  connectionId: string
  resourceTypes?: AccountingResourceType[]
}) {
  const connection = await findAccountingConnectionRow(
    params.tenantId,
    params.connectionId
  )
  if (!connection) return null
  if (connection.status !== 'active')
    throw new AppHttpError({
      code: 'billing/accounting-connection-inactive',
      message: 'Activate the accounting provider connection before reconciling.',
      httpStatus: 409,
    })
  const resourceTypes = params.resourceTypes?.length
    ? [...new Set(params.resourceTypes)]
    : [...accountingResourceTypes]
  const enqueued = await enqueueConnectionResources(
    params.tenantId,
    params.connectionId,
    resourceTypes,
    nowUnixSeconds()
  )
  return {
    object: 'accounting-provider-reconcile' as const,
    connectionId: params.connectionId,
    resourceTypes,
    enqueued,
  }
}
