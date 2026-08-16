import { SalesListLoading } from '../../_components/sales-list-loading'

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Quotes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Quotes' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Quotes' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Quotes' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Quotes' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Quotes' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Quotes' },
]

export default function Loading() {
  return (
    <SalesListLoading
      title="Quotes"
      options={OPTIONS}
      primary={{
        label: 'New',
        href: '/quotes/new',
        permission: 'sales:write',
      }}
      columns={[
        { label: 'Quote', cell: 'avatar' },
        { label: 'Customer' },
        { label: 'Amount' },
        { label: 'Status', cell: 'badge' },
      ]}
    />
  )
}
