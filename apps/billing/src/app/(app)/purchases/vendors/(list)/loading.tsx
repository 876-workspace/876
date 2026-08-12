import { StreamingResourceLoading } from '@/components/patterns/streaming-resource-page'

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Vendors' },
  { value: 'active', label: 'Active', headingLabel: 'Active Vendors' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Vendors' },
]

export default function Loading() {
  return (
    <StreamingResourceLoading
      title="Vendors"
      status="all"
      options={OPTIONS}
      primary={{
        label: 'New Vendor',
        href: '/purchases/vendors/new',
        permission: 'purchases:write',
      }}
      columns={[
        { label: 'Vendor', cell: 'avatar' },
        { label: 'Reference' },
        { label: 'Currency' },
        { label: 'Status', cell: 'badge' },
      ]}
    />
  )
}
