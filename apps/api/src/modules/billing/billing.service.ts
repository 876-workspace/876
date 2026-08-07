import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { listObject, type ListObject } from '@/http/envelope'

/** The shape both outbox dispatch loops report. */
type DispatchSummary = {
  claimed: number
  delivered: number
  failed: number
  configured: boolean
}

import type {
  BillingAccountCreate,
  BillingAccountUpdate,
  FinanceProvisioningReconcileRequest,
  SubscriptionCreate,
  SubscriptionItemCreate,
  SubscriptionItemUpdate,
  SubscriptionUpdate,
} from './billing.schemas'
import { enqueueReconcileAll } from '@/services/billing-customer-sync'
import { createBillingCustomerSyncRepository } from '@/services/billing-customer-sync.repository'
import { reconcileFinanceConnections } from '@/services/finance-provisioning'
import { createFinanceProvisioningRepository } from '@/services/finance-provisioning.repository'
import { dispatchBillingCustomerSyncOnce } from '@/workers/billing-customer-dispatch'
import { dispatchFinanceProvisioningOnce } from '@/workers/finance-provisioning-dispatch'

import * as repository from './billing.repository'
import {
  serializeBillingAccount,
  serializeSubscription,
  serializeSubscriptionItem,
} from './billing.serializers'

// ── Billing sync and finance provisioning ────────────────────────────────────
//
// Each of these four admin routes is a thin trigger over an already-ported
// service or worker. They call it directly: a failure must reach the caller as
// an error, not be reported as a successful run that happened to do nothing.

export function dispatchBillingCustomerSync(): Promise<DispatchSummary> {
  return dispatchBillingCustomerSyncOnce()
}

export function reconcileBillingCustomerSync(): Promise<{
  organizations: number
  users: number
}> {
  return enqueueReconcileAll(
    { repository: createBillingCustomerSyncRepository() },
    nowUnixSeconds()
  )
}

export async function reconcileFinanceProvisioning(
  body: FinanceProvisioningReconcileRequest
): Promise<{ scanned: number; enqueued: number; next_cursor: string | null }> {
  const result = await reconcileFinanceConnections(
    { repository: createFinanceProvisioningRepository() },
    {
      appId: body.app_id ?? null,
      limit: body.limit,
      startingAfter: body.starting_after ?? null,
    }
  )

  return {
    scanned: result.examined,
    enqueued: result.changed,
    next_cursor: result.nextCursor,
  }
}

export function dispatchFinanceProvisioning(): Promise<DispatchSummary> {
  return dispatchFinanceProvisioningOnce()
}

// ── Billing Accounts ─────────────────────────────────────────────────────────

export async function listBillingAccounts(params: {
  organization_id?: string
  limit: number
}) {
  const rows = await repository.listBillingAccounts({
    organizationId: params.organization_id ?? null,
    limit: params.limit,
  })
  return listObject({
    data: rows.map(serializeBillingAccount),
    hasMore: false,
    url: '/billing/accounts',
  })
}

export async function createBillingAccount(body: BillingAccountCreate) {
  const now = BigInt(nowUnixSeconds())
  const row = await repository.createBillingAccount({
    id: generateId('billingAccount'),
    organizationId: body.organization_id,
    name: body.name ?? null,
    email: body.email ?? null,
    invoiceEmail: body.invoice_email ?? null,
    currency: body.currency,
    taxExempt: body.tax_exempt ?? null,
    invoiceSettings: body.invoice_settings ?? null,
    preferredLocales: body.preferred_locales ?? null,
    address: body.address ?? null,
    shipping: body.shipping ?? null,
    metadata: body.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return serializeBillingAccount(row)
}

export async function retrieveBillingAccount(accountId: string) {
  const row = await repository.findBillingAccountById(accountId)
  if (!row)
    throw new AppHttpError({
      code: 'billing_account/not-found',
      message: 'Billing account not found.',
      httpStatus: 404,
    })
  return serializeBillingAccount(row)
}

export async function updateBillingAccount(
  accountId: string,
  body: BillingAccountUpdate
) {
  const data: Record<string, unknown> = {}
  if ('name' in body) data.name = body.name ?? null
  if ('email' in body) data.email = body.email ?? null
  if ('invoice_email' in body) data.invoiceEmail = body.invoice_email ?? null
  if ('currency' in body && body.currency !== undefined)
    data.currency = body.currency
  if ('tax_exempt' in body) data.taxExempt = body.tax_exempt ?? null
  if ('default_payment_method_id' in body)
    data.defaultPaymentMethodId = body.default_payment_method_id ?? null
  if ('invoice_settings' in body)
    data.invoiceSettings = body.invoice_settings ?? null
  if ('preferred_locales' in body)
    data.preferredLocales = body.preferred_locales ?? null
  if ('address' in body) data.address = body.address ?? null
  if ('shipping' in body) data.shipping = body.shipping ?? null
  if ('metadata' in body) data.metadata = body.metadata ?? null
  const row = await repository.updateBillingAccount(accountId, data)
  if (!row)
    throw new AppHttpError({
      code: 'billing_account/not-found',
      message: 'Billing account not found.',
      httpStatus: 404,
    })
  return serializeBillingAccount(row)
}

export async function deleteBillingAccount(accountId: string) {
  const ok = await repository.deleteBillingAccount(accountId)
  if (!ok)
    throw new AppHttpError({
      code: 'billing_account/not-found',
      message: 'Billing account not found.',
      httpStatus: 404,
    })
  return {
    object: 'billing_account' as const,
    id: accountId,
    deleted: true as const,
  }
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function createSubscription(body: SubscriptionCreate) {
  const app = await repository.findAppById(body.app_id)
  if (!app)
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  if (app.appKind !== 'product')
    throw new AppHttpError({
      code: 'subscription/app-kind-invalid',
      message: 'Subscriptions can only be created for product apps.',
      httpStatus: 422,
    })
  if (body.billing_account_id) {
    const account = await repository.findBillingAccountById(
      body.billing_account_id
    )
    if (!account || account.organizationId !== body.organization_id) {
      throw new AppHttpError({
        code: 'billing_account/not-found',
        message: 'Billing account not found for this organization.',
        httpStatus: 404,
      })
    }
  }
  const row = await repository.provisionSubscription({
    organizationId: body.organization_id,
    appId: body.app_id,
    priceId: body.price_id ?? null,
    status: body.status ?? 'active',
  })
  const updates: Record<string, unknown> = {}
  if (body.billing_account_id !== undefined)
    updates.billingAccountId = body.billing_account_id
  if (body.collection_method !== undefined)
    updates.collectionMethod = body.collection_method
  if (body.cancel_at_period_end !== undefined)
    updates.cancelAtPeriodEnd = body.cancel_at_period_end
  if (body.metadata !== undefined) updates.metadata = body.metadata
  let current: typeof row = row
  if (Object.keys(updates).length > 0) {
    const updated = await repository.updateSubscriptionById(row.id, updates)
    if (!updated)
      throw new AppHttpError({
        code: 'subscription/not-found',
        message: 'Subscription not found.',
        httpStatus: 404,
      })
    current = updated
  }
  return serializeSubscription(current)
}

export async function retrieveSubscription(subscriptionId: string) {
  const row = await repository.findSubscriptionById(subscriptionId)
  if (!row)
    throw new AppHttpError({
      code: 'subscription/not-found',
      message: 'Subscription not found.',
      httpStatus: 404,
    })
  return serializeSubscription(row)
}

export async function listSubscriptions(params: {
  organization_id?: string
  app_id?: string
  limit: number
}): Promise<ListObject<ReturnType<typeof serializeSubscription>>> {
  const rows = await repository.listSubscriptions({
    organizationId: params.organization_id ?? null,
    appId: params.app_id ?? null,
    limit: params.limit,
  })
  return listObject({
    data: rows.map(serializeSubscription),
    hasMore: false,
    url: '/billing/subscriptions',
  })
}

export async function updateSubscription(
  subscriptionId: string,
  body: SubscriptionUpdate
) {
  const existing = await repository.findSubscriptionById(subscriptionId)
  if (!existing)
    throw new AppHttpError({
      code: 'subscription/not-found',
      message: 'Subscription not found.',
      httpStatus: 404,
    })
  if (body.billing_account_id) {
    const account = await repository.findBillingAccountById(
      body.billing_account_id
    )
    if (!account || account.organizationId !== existing.organizationId) {
      throw new AppHttpError({
        code: 'billing_account/not-found',
        message: 'Billing account not found for this organization.',
        httpStatus: 404,
      })
    }
  }
  const updates: Record<string, unknown> = {}
  if (body.billing_account_id !== undefined)
    updates.billingAccountId = body.billing_account_id
  if (body.status !== undefined && body.status !== null)
    updates.status = body.status
  if (body.collection_method !== undefined)
    updates.collectionMethod = body.collection_method
  if (body.cancel_at_period_end !== undefined)
    updates.cancelAtPeriodEnd = body.cancel_at_period_end
  if (body.metadata !== undefined) updates.metadata = body.metadata
  if (Object.keys(updates).length === 0 && !body.price_id) {
    throw new AppHttpError({
      code: 'subscription/update-required',
      message: 'Provide at least one field to update.',
      httpStatus: 422,
    })
  }
  let current: typeof existing = existing
  if (Object.keys(updates).length > 0) {
    const updated = await repository.updateSubscriptionById(
      subscriptionId,
      updates
    )
    if (updated) current = updated
  }
  if (body.price_id) {
    await repository.setSubscriptionPrice(subscriptionId, body.price_id)
    const refreshed = await repository.findSubscriptionById(subscriptionId)
    if (refreshed) current = refreshed
  }
  return serializeSubscription(current)
}

export async function deleteSubscription(subscriptionId: string) {
  const ok = await repository.deleteSubscriptionById(subscriptionId)
  if (!ok)
    throw new AppHttpError({
      code: 'subscription/not-found',
      message: 'Subscription not found.',
      httpStatus: 404,
    })
  return {
    object: 'subscription' as const,
    id: subscriptionId,
    deleted: true as const,
  }
}

// ── Subscription Items ───────────────────────────────────────────────────────

export async function createSubscriptionItem(
  subscriptionId: string,
  body: SubscriptionItemCreate
) {
  const sub = await repository.findSubscriptionById(subscriptionId)
  if (!sub)
    throw new AppHttpError({
      code: 'subscription/not-found',
      message: 'Subscription not found.',
      httpStatus: 404,
    })
  const price = await repository.findPriceById(body.price_id)
  if (!price)
    throw new AppHttpError({
      code: 'price/not-found',
      message: 'Price not found.',
      httpStatus: 404,
    })
  const row = await repository.createSubscriptionItem({
    subscriptionId,
    priceId: body.price_id,
    quantity: body.quantity,
  })
  return serializeSubscriptionItem(row)
}

export async function updateSubscriptionItem(
  subscriptionId: string,
  itemId: string,
  body: SubscriptionItemUpdate
) {
  try {
    const row = await repository.updateSubscriptionItem(
      subscriptionId,
      itemId,
      {
        quantity: body.quantity ?? undefined,
        priceId: body.price_id ?? undefined,
      }
    )
    if (!row)
      throw new AppHttpError({
        code: 'subscription_item/not-found',
        message: 'Subscription item not found.',
        httpStatus: 404,
      })
    return serializeSubscriptionItem(row)
  } catch (e) {
    if (e instanceof AppHttpError) throw e
    if ((e as Error).message === 'price/not-found')
      throw new AppHttpError({
        code: 'price/not-found',
        message: 'Price not found.',
        httpStatus: 404,
      })
    throw e
  }
}

export async function deleteSubscriptionItem(
  subscriptionId: string,
  itemId: string
) {
  const ok = await repository.deleteSubscriptionItem(subscriptionId, itemId)
  if (!ok)
    throw new AppHttpError({
      code: 'subscription_item/not-found',
      message: 'Subscription item not found.',
      httpStatus: 404,
    })
  return {
    object: 'subscription_item' as const,
    id: itemId,
    deleted: true as const,
  }
}
