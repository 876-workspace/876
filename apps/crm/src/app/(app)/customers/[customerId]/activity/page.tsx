import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerActivity } from '../../_components/customer-activity'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Activity' }

export default async function CustomerActivityPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerActivity customer={customer} />
}
