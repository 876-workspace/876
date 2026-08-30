import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CustomerOverview } from '@876/crm-ui/customer-overview'

import { loadOrgCustomerRecord } from '@/features/crm/customer-record-data'
import { resolveOrg } from '../../../../_data'

type Props = { params: Promise<{ slug: string; customerId: string }> }

export const metadata: Metadata = { title: 'Customer - Organizations' }

export default async function CrmWorkspaceCustomerPage({ params }: Props) {
  const { slug, customerId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const record = await loadOrgCustomerRecord(org.id, customerId)
  if (!record.row) return null

  return <CustomerOverview customer={record.row} />
}
