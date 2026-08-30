import { notFound } from 'next/navigation'

import { getCustomerRow } from '../../_lib/customers-data'
import { CustomerStatementTab } from '../../_components/customer-statement-tab'

type Props = { params: Promise<{ customerId: string }> }

export const metadata = { title: 'Customer · Statement' }

export default async function CustomerStatementPage({ params }: Props) {
  const { customerId } = await params
  const customer = await getCustomerRow(customerId)
  if (!customer) notFound()

  return <CustomerStatementTab customer={customer} />
}
