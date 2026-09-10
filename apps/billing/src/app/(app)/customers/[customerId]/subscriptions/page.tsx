import { CustomerTimelinePanel } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerSubscriptionsPage() {
  return (
    <CustomerTimelinePanel
      title="Subscriptions"
      emptyMessage="No subscriptions have been recorded for this customer yet."
      state={{ status: 'empty' }}
    />
  )
}
