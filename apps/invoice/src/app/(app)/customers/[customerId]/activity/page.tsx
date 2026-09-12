import type { Metadata } from 'next'

import { CustomerTimelinePanel } from '@876/billing-ui/panels/customer-timeline-panel'

export const metadata: Metadata = {
  title: 'Activity',
}

export default function CustomerActivityPage() {
  return <CustomerTimelinePanel state={{ status: 'empty' }} />
}