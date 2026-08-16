import { SalesListLoading } from '../../_components/sales-list-loading'

export default function Loading() {
  return (
    <SalesListLoading
      title="Payments Received"
      options={[{ value: 'all', label: 'All', headingLabel: 'All Payments' }]}
      primary={{
        label: 'New',
        href: '/payments/new',
        permission: 'payments:write',
      }}
      columns={[
        { label: 'Payment', cell: 'avatar' },
        { label: 'Deposit account' },
        { label: 'Amount' },
      ]}
    />
  )
}
