import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerRequestsTab } from '../../_components/customer-requests-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Requests' }

export default async function CustomerRequestsPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerRequestsTab customerId={customer.profileId} />
}
