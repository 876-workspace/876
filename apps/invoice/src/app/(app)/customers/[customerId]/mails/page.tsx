import { Suspense } from 'react'
import { CustomerTimelinePanel, CustomerTimelinePanelSkeleton } from '@876/billing-ui/panels/customer-timeline-panel'

export default function CustomerMailsPage() { return <Suspense fallback={<CustomerTimelinePanelSkeleton />}><CustomerMailsData /></Suspense> }
async function CustomerMailsData() { return <CustomerTimelinePanel title="Mails" state={{ status: 'empty' }} /> }
