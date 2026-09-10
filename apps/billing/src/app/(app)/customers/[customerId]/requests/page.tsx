import { CustomerTimelinePanel } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerRequestsPage() {
  return (
    <CustomerTimelinePanel
      title="Requests"
      emptyMessage="No requests have been recorded for this customer yet."
      state={{ status: 'empty' }}
    />
  )
}
