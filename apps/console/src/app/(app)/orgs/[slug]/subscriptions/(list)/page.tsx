import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization, AdminSubscriptionStatus } from '@876/admin'
import type { AdminSubscription } from '@876/admin'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import {
  resolveOrg,
  resolveOrgBillingAccounts,
  resolveOrgSubscriptions,
} from '../../_data'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'
import {
  isSubscriptionStatus,
  SUBSCRIPTION_STATUS_OPTIONS,
} from '../_components/subscription-status-options'
import { SubscriptionsSplit } from '../_components/subscriptions-split'
import {
  SubscriptionBillingSummary,
  SubscriptionBillingSummaryFallback,
} from '@/features/billing/components/subscription-billing-summary'
import { $876 } from '@/lib/876'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ subscription?: string; status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Subscriptions' }
  return {
    title: `${org.name ?? org.slug} • Subscriptions - Organizations`,
  }
}

export default async function OrganizationSubscriptionsPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, { subscription, status }] = await Promise.all([
    params,
    searchParams,
  ])
  const selectedStatus =
    SUBSCRIPTION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.value ?? 'all'

  // With a subscription selected the detail panel owns the whole area, so the
  // list toolbar (title filter, Add, refresh) steps aside until it is closed.
  return (
    <div>
      {!subscription && (
        <ResourceToolbar
          title="Subscriptions"
          titleFilter={
            <StatusFilterHeading
              label="Subscriptions"
              value={selectedStatus}
              options={SUBSCRIPTION_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/orgs/${slug}/subscriptions/new`}
          primaryVariant="info"
          refresh
        />
      )}
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={SUBSCRIPTIONS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <SubscriptionsShell
          slug={slug}
          selectedId={subscription}
          status={
            isSubscriptionStatus(selectedStatus) ? selectedStatus : undefined
          }
        />
      </Suspense>
    </div>
  )
}

async function SubscriptionsShell({
  slug,
  selectedId,
  status,
}: {
  slug: string
  selectedId?: string
  status?: AdminSubscriptionStatus
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <SubscriptionsData
      org={org}
      slug={slug}
      selectedId={selectedId}
      status={status}
    />
  )
}

async function SubscriptionsData({
  org,
  slug,
  selectedId,
  status,
}: {
  org: AdminOrganization
  slug: string
  selectedId?: string
  status?: AdminSubscriptionStatus
}) {
  const subscriptions = await resolveOrgSubscriptions(org.id, status)

  const selected = (subscriptions ?? []).find((item) => item.id === selectedId)
  const billing = selected ? (
    <Suspense fallback={<SubscriptionBillingSummaryFallback />}>
      <SubscriptionBillingData
        organizationId={org.id}
        subscription={selected}
      />
    </Suspense>
  ) : null

  return (
    <SubscriptionsSplit
      subscriptions={subscriptions ?? []}
      billing={billing}
      selectedId={selectedId}
      basePath={`/orgs/${slug}/subscriptions`}
    />
  )
}

async function SubscriptionBillingData({
  organizationId,
  subscription,
}: {
  organizationId: string
  subscription: AdminSubscription
}) {
  const [accounts, customers] = await Promise.all([
    resolveOrgBillingAccounts(organizationId),
    $876.customers.list(organizationId, { limit: 25 }),
  ])
  const account = subscription.billing_account_id
    ? ((accounts?.data ?? []).find(
        (item) => item.id === subscription.billing_account_id
      ) ?? null)
    : null
  if (!account)
    return (
      <SubscriptionBillingSummary
        account={null}
        paymentMethods={[]}
        subscriptionPaymentMethodId={subscription.default_payment_method_id}
        latestInvoiceId={subscription.latest_invoice_id}
      />
    )

  const customer = customers.data?.data[0]
  if (!customer)
    return (
      <SubscriptionBillingSummary
        account={null}
        paymentMethods={[]}
        subscriptionPaymentMethodId={subscription.default_payment_method_id}
        latestInvoiceId={subscription.latest_invoice_id}
      />
    )

  const methods = await $876.paymentMethods.listForCustomer(
    organizationId,
    customer.id,
    { limit: 25 }
  )
  return (
    <SubscriptionBillingSummary
      account={{
        id: account.id,
        name: account.name,
        email: account.email,
        currency: account.currency,
        taxExempt: account.tax_exempt,
        balance: account.balance,
        defaultPaymentMethodId: account.default_payment_method_id,
      }}
      paymentMethods={(methods.data?.data ?? []).map((method) => ({
        id: method.id,
        displayLabel: method.displayLabel,
        isDefault: method.isDefault,
        card: method.card,
        expMonth: method.expMonth,
        expYear: method.expYear,
      }))}
      subscriptionPaymentMethodId={subscription.default_payment_method_id}
      latestInvoiceId={subscription.latest_invoice_id}
    />
  )
}
