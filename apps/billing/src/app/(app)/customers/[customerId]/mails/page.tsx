import type { Metadata } from 'next'

import { CustomerTimelinePanel } from '@876/billing-ui/panels/customer-timeline-panel'

export const metadata: Metadata = {
  title: 'Mails',
}

export default function CustomerMailsPage() {
  return (
    <CustomerTimelinePanel
      title="Mails"
      emptyMessage="No mail activity has been recorded for this customer yet."
      state={{ status: 'empty' }}
    />
  )
}