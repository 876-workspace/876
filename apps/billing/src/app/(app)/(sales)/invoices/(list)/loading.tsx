import { SalesListLoading } from '../../_components/sales-list-loading'

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

export default function Loading() {
  return (
    <SalesListLoading
      title="Invoices"
      options={OPTIONS}
      primary={{
        label: 'New',
        href: '/invoices/new',
        permission: 'sales:write',
      }}
      columns={[
        { label: 'Invoice', cell: 'avatar' },
        { label: 'Customer' },
        { label: 'Amount' },
        { label: 'Status', cell: 'badge' },
      ]}
    />
  )
}
