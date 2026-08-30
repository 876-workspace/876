import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerContactsTab } from '../../_components/customer-contacts-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Contacts' }

export default async function CustomerContactsPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerContactsTab customer={customer} />
}
