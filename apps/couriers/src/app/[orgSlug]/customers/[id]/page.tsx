import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'
import {
  $couriers,
  isCouriersNotFound,
  requireCouriersData,
  toCustomerView,
} from '@/lib/couriers'

import { CustomerActions } from './_components/customer-actions'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function CustomerPage({ params }: Props) {
  const { orgSlug, id } = await params

  return (
    <Page>
      {/* The breadcrumb is chrome: it depends only on params, so it renders on
          the first paint rather than shimmering with the record. */}
      <PageBreadcrumb
        href={`/${orgSlug}/customers`}
        label="Customers"
        className="mb-4"
      />
      <Suspense fallback={<CustomerFallback />}>
        <CustomerData orgSlug={orgSlug} id={id} />
      </Suspense>
    </Page>
  )
}

function CustomerFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">
        {value || <span className="text-muted-foreground">&mdash;</span>}
      </dd>
    </div>
  )
}

async function CustomerData({ orgSlug, id }: { orgSlug: string; id: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  const customerResult = await $couriers.customers.retrieve(ctx.tenant.id, id)
  if (isCouriersNotFound(customerResult)) notFound()
  const profile = toCustomerView(requireCouriersData(customerResult))

  const $876 = await get876Client()

  // Independent of one another, so they cost one round trip rather than three.
  const [registry, mailboxesResult, branchResult] = await Promise.all([
    $876.billing.customers.retrieve(
      ctx.tenant.orgId,
      profile.billingCustomerId
    ),
    $couriers.customers.mailboxes.list(ctx.tenant.id, profile.id),
    profile.branchId
      ? $couriers.branches.retrieve(ctx.tenant.id, profile.branchId)
      : null,
  ])
  const mailboxes = requireCouriersData(mailboxesResult).data
  const branch = branchResult?.error ? null : (branchResult?.data ?? null)

  const identity = registry.data
  const name = identity?.name || profile.billingCustomerId
  const mailbox = mailboxes.find((item) => item.is_primary) ?? mailboxes[0]
  const isActive = profile.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="876-page-title">{name}</h1>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Suspended'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-[0.8125rem]">
            {[mailbox?.number, branch?.name, identity?.email, identity?.phone]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <CustomerActions orgSlug={orgSlug} id={id} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="876-card p-5">
          <h2 className="font-medium">Identity</h2>
          <dl className="mt-4 space-y-2 text-[0.8125rem]">
            <Field label="Name" value={name} />
            <Field label="Company" value={identity?.companyName ?? null} />
            <Field label="Email" value={identity?.email ?? null} />
            <Field label="Phone" value={identity?.phone ?? null} />
          </dl>
        </section>

        <section className="876-card p-5">
          <h2 className="font-medium">Courier details</h2>
          <dl className="mt-4 space-y-2 text-[0.8125rem]">
            <Field label="Mailbox" value={mailbox?.number ?? null} />
            <Field label="Home branch" value={branch?.name ?? null} />
            <Field label="TRN" value={profile.trn} />
            <Field
              label="Commercial"
              value={profile.isCommercial ? 'Yes' : 'No'}
            />
          </dl>
        </section>
      </div>
    </div>
  )
}
