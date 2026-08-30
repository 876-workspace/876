import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerMailsTab } from '../../_components/customer-mails-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Mails' }

export default async function CustomerMailsPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerMailsTab customer={customer} />
}
