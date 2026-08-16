import { SalesListLoading } from '../../_components/sales-list-loading'

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Estimates' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Estimates' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Estimates' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Estimates' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Estimates' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Estimates' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Estimates' },
]

export default function Loading() {
  return (
    <SalesListLoading
      title="Estimates"
      options={OPTIONS}
      primary={{
        label: 'New',
        href: '/estimates/new',
        permission: 'sales:write',
      }}
      columns={[
        { label: 'Estimate', cell: 'avatar' },
        { label: 'Customer' },
        { label: 'Amount' },
        { label: 'Status', cell: 'badge' },
      ]}
    />
  )
}
