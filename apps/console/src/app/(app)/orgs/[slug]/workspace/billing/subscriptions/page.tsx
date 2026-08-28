import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Subscriptions' }

  return { title: `${org.name ?? org.slug} • Subscriptions - Billing` }
}

export default async function BillingWorkspaceSubscriptionsPage({
  params,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Subscriptions"
      description="No customer subscriptions are active in this workspace yet."
      iconKey="requests"
    />
  )
}
