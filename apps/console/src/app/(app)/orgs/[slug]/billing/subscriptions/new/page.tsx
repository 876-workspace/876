import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'

import { resolveOrg, resolveOrgBillingAccounts } from '../../../_data'
import { SubscriptionCreate } from './subscription-create'

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
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [accounts, productsResult] = await Promise.all([
    resolveOrgBillingAccounts(org.id),
    $876.products.list({ status: 'active' }),
  ])

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

      <SubscriptionCreate
        orgId={org.id}
        orgSlug={slug}
        accounts={accounts?.data ?? []}
        products={productsResult.data?.data ?? []}
      />
    </div>
  )
}
