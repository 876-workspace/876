import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { resolveCustomer } from './_lib/customer-data'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function CustomerOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<CustomerOverviewFallback />}>
      <CustomerOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function CustomerOverviewFallback() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
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

async function CustomerOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) notFound()

  const { profile, identity, mailbox, branch } = customer
  const name = identity?.name || profile.billingCustomerId

  return (
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
  )
}
