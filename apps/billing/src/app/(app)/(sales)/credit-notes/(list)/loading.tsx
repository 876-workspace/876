import { SalesListLoading } from '../../_components/sales-list-loading'

export default function Loading() {
  return (
    <SalesListLoading
      title="Credit Notes"
      options={[
        { value: 'all', label: 'All', headingLabel: 'All Credit Notes' },
        { value: 'draft', label: 'Draft' },
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'void', label: 'Void' },
      ]}
      primary={{
        label: 'New',
        href: '/credit-notes/new',
        permission: 'sales:write',
      }}
      columns={[
        { label: 'Credit note', cell: 'avatar' },
        { label: 'Customer' },
        { label: 'Amount' },
        { label: 'Balance' },
        { label: 'Status', cell: 'badge' },
      ]}
    />
  )
}
