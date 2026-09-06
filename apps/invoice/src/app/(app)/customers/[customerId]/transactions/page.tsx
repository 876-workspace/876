import { Suspense } from 'react'
import { CustomerTransactionsPanel, CustomerTransactionsPanelSkeleton } from '@876/billing-ui/panels/customer-transactions-panel'

export default function CustomerTransactionsPage() { return <Suspense fallback={<CustomerTransactionsPanelSkeleton />}><CustomerTransactionsData /></Suspense> }
async function CustomerTransactionsData() { return <CustomerTransactionsPanel state={{ status: 'empty' }} hrefForDocument={(id) => `/invoices/${id}`} /> }
