import { Suspense } from 'react'
import { CustomerStatementPanel, CustomerStatementPanelSkeleton } from '@876/billing-ui/panels/customer-statement-panel'

export default function CustomerStatementPage() { return <Suspense fallback={<CustomerStatementPanelSkeleton />}><CustomerStatementData /></Suspense> }
async function CustomerStatementData() { return <CustomerStatementPanel state={{ status: 'empty' }} /> }
