import { Suspense } from 'react'
import { CustomerTimelinePanel, CustomerTimelinePanelSkeleton } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerRequestsPage() { return <Suspense fallback={<CustomerTimelinePanelSkeleton />}><CustomerRequestsData /></Suspense> }
async function CustomerRequestsData() { return <CustomerTimelinePanel title="Requests" state={{ status: 'empty' }} /> }
