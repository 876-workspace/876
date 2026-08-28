import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Invoice' }

  return { title: `${org.name ?? org.slug} • Invoice - Organizations` }
}

export default async function InvoiceWorkspaceOverviewPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Overview"
      description="This organization does not have any invoice overview data in this workspace yet."
      iconKey="dashboard"
    />
  )
}
