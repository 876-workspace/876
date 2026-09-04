import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '@/features/orgs/org-data'

type Props = { params: Promise<{ orgSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Billing' }

  return { title: `${org.name ?? org.slug} • Billing - Organizations` }
}

export default async function BillingWorkspaceOverviewPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Overview"
      description="This organization does not have any billing overview data in this workspace yet."
      iconKey="dashboard"
    />
  )
}
