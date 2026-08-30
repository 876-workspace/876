import { notFound } from 'next/navigation'

import { getCustomerRow } from '../_lib/customers-data'
import { CustomerOverviewTab } from './_components/customer-overview-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer' }

export default async function CustomerOverviewPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerOverviewTab customer={customer} />
}
