import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CustomerBillingFactsPanel, CustomerBillingFactsPanelSkeleton } from '@876/billing-ui/panels/customer-billing-facts-panel'
import { CustomerContactPanel, CustomerContactPanelSkeleton } from '@876/billing-ui/panels/customer-contact-panel'
import { CustomerOrganizationPanel, CustomerOrganizationPanelSkeleton } from '@876/billing-ui/panels/customer-organization-panel'
import { CustomerReceivablesPanel, CustomerReceivablesPanelSkeleton } from '@876/billing-ui/panels/customer-receivables-panel'

import { getInvoiceContext } from '@/lib/auth/context'
import { formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'

interface Props { params: Promise<{ customerId: string }> }
export const metadata: Metadata = { title: 'Customer', description: 'Customer details.' }
export default function CustomerDetailPage({ params }: Props) { return <Suspense fallback={<CustomerOverviewSkeleton />}><CustomerOverviewData params={params} /></Suspense> }

async function CustomerOverviewData({ params }: Props) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const billing = await getBilling(context.orgId)
  const result = await billing.customers.retrieve(customerId)
  if (result.error) { if (result.error.code.endsWith('/not-found')) notFound(); return <CustomerReceivablesPanel state={{ status: 'error', error: result.error }} /> }
  const customer = result.data
  const currency = customer.defaultCurrency ?? 'JMD'
  const primary = customer.primaryContact
  const contactName = primary ? [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() || customer.name : customer.name
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,32%)_1fr]"><div className="space-y-6"><CustomerContactPanel state={{ status: 'ready', data: { avatar: null, name: contactName, role: null, sourceLabel: 'Customer', email: primary?.email ?? customer.email, phone: primary?.workPhone ?? primary?.mobilePhone ?? customer.phone } }} /><CustomerBillingFactsPanel state={{ status: 'ready', data: { type: customer.customerType.toLowerCase().replaceAll('_', ' '), currency, reference: customer.organizationId ?? customer.userId ?? customer.externalReference ?? '—', addedDate: new Date(customer.createdAt * 1000).toLocaleDateString('en-JM') } }} /><CustomerOrganizationPanel state={{ status: 'empty' }} /></div><div className="space-y-6"><CustomerReceivablesPanel state={{ status: 'ready', data: { outstanding: formatMoney(customer.outstandingReceivable, currency), overdue: '—', paid: '—', currency } }} /></div></div>
}
function CustomerOverviewSkeleton() { return <div className="grid gap-6 lg:grid-cols-[minmax(0,32%)_1fr]"><div className="space-y-6"><CustomerContactPanelSkeleton /><CustomerBillingFactsPanelSkeleton /><CustomerOrganizationPanelSkeleton /></div><CustomerReceivablesPanelSkeleton /></div> }
