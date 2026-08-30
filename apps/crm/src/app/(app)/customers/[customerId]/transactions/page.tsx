import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerTransactionsTab } from '../../_components/customer-transactions-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Transactions' }

export default async function CustomerTransactionsPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerTransactionsTab customer={customer} />
}
