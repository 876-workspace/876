import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'

import {
  resolveOrg,
  resolveOrgBillingAccounts,
  resolveOrgSubscriptions,
} from '../../_data'
import { SubscriptionsManager } from '../subscriptions-manager'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Billing subscriptions' }
  return {
    title: `${org.name ?? org.slug} • Billing subscriptions - Organizations`,
  }
}

export default async function OrganizationBillingSubscriptionsPage({
  params,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [accounts, subscriptions, productsResult] = await Promise.all([
    resolveOrgBillingAccounts(org.id),
    resolveOrgSubscriptions(org.id),
    $876.products.list({ status: 'active' }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing`}
          label="Billing"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">Subscriptions</h1>
      </div>

      <SubscriptionsManager
        orgSlug={slug}
        accounts={accounts?.data ?? []}
        subscriptions={subscriptions ?? []}
        products={productsResult.data?.data ?? []}
      />
    </div>
  )
}
