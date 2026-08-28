import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Couriers' }

  return { title: `${org.name ?? org.slug} • Couriers - Couriers` }
}

export default async function CouriersWorkspaceCouriersPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Couriers"
      description="No couriers or drivers have been enrolled in this workspace yet."
      iconKey="customers"
    />
  )
}
