import { CustomerTimelinePanel } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerMailsPage() {
  return (
    <CustomerTimelinePanel
      title="Mails"
      emptyMessage="No mail activity has been recorded for this customer yet."
      state={{ status: 'empty' }}
    />
  )
}
