import { Suspense } from 'react'
import { CustomerTimelinePanel, CustomerTimelinePanelSkeleton } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerActivityPage() { return <Suspense fallback={<CustomerTimelinePanelSkeleton />}><CustomerActivityData /></Suspense> }
async function CustomerActivityData() { return <CustomerTimelinePanel state={{ status: 'empty' }} /> }
