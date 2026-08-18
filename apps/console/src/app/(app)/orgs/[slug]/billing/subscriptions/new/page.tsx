import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'

import { resolveOrg, resolveOrgBillingAccounts } from '../../../_data'
import { SubscriptionCreate } from './_components/subscription-create'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'New subscription' }
  return {
    title: `${org.name ?? org.slug} • New subscription - Organizations`,
  }
}

export default async function NewBillingSubscriptionPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing/subscriptions`}
          label="Subscriptions"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">New Subscription</h1>
      </div>

      <Suspense fallback={<SubscriptionFormFallback />}>
        <SubscriptionFormData slug={slug} />
      </Suspense>
    </div>
  )
}

async function SubscriptionFormData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [accounts, productsResult] = await Promise.all([
    resolveOrgBillingAccounts(org.id),
    $876.entitlementPlans.admin.list({ status: 'active' }),
  ])

  return (
    <SubscriptionCreate
      orgId={org.id}
      orgSlug={slug}
      accounts={accounts?.data ?? []}
      products={productsResult.data?.data ?? []}
    />
  )
}

function SubscriptionFormFallback() {
  return (
    <div className="876-card space-y-5 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
