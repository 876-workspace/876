import { CustomerOverview } from '@876/crm-ui/customer-overview'
import type { Metadata } from 'next'

import { loadOrgCustomerRecord } from '@/features/crm/customer-record-data'
import { getPlatformOrganization } from '@/lib/platform-org'

type Props = { params: Promise<{ customerId: string }> }

export const metadata: Metadata = { title: 'Customer - Requests' }

export default async function PlatformRequestCustomerPage({ params }: Props) {
  const { customerId } = await params
  const org = await getPlatformOrganization()
  if (!org) return null

  const record = await loadOrgCustomerRecord(org.id, customerId)
  if (!record.row) return null

  return <CustomerOverview customer={record.row} />
}
