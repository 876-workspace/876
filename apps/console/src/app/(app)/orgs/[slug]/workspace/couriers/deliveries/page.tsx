import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Deliveries' }

  return { title: `${org.name ?? org.slug} • Deliveries - Couriers` }
}

export default async function CouriersWorkspaceDeliveriesPage({
  params,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Deliveries"
      description="No live package deliveries or dispatches are active in this workspace yet."
      iconKey="packages"
    />
  )
}
