import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Invoices' }

  return { title: `${org.name ?? org.slug} • Invoices - Invoice` }
}

export default async function InvoiceWorkspaceInvoicesPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Invoices"
      description="No customer invoices or drafts have been generated in this workspace yet."
      iconKey="billing"
    />
  )
}
