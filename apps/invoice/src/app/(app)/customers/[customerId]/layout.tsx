import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DetailCard, DetailCardBody, DetailCardHeader, DetailCardRouteTabs } from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { CustomerActions } from './_components/customer-actions'

export default async function CustomerDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ customerId: string }> }) {
  const { customerId } = await params
  const base = `/customers/${customerId}`
  const tabs = [{ label: 'Overview', href: base, exact: true }, { label: 'Transactions', href: `${base}/transactions` }, { label: 'Requests', href: `${base}/requests` }, { label: 'Mails', href: `${base}/mails` }, { label: 'Statement', href: `${base}/statement` }, { label: 'Activity', href: `${base}/activity` }]
  return <DetailCard aria-label="Customer"><Suspense fallback={<CustomerHeaderSkeleton />}><CustomerHeaderData customerId={customerId} /></Suspense><DetailCardRouteTabs tabs={tabs} /><DetailCardBody>{children}</DetailCardBody></DetailCard>
}
async function CustomerHeaderData({ customerId }: { customerId: string }) { const context = await getInvoiceContext(); if (!context) redirect('/no-access'); const billing = await getBilling(context.orgId); const result = await billing.customers.retrieve(customerId); if (result.error) { if (result.error.code.endsWith('/not-found')) notFound(); return null }; const customer = result.data; return <DetailCardHeader icon={<CustomerAvatar name={customer.name} size="lg" />} title={customer.name} meta={<Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>{customer.status === 'ACTIVE' ? 'Active' : 'Archived'}</Badge>} actions={<CustomerActions customerId={customer.id} customerName={customer.name} canManage={context.role !== 'staff'} />} closeHref="/customers" closeLabel="Close customer details" /> }
function CustomerHeaderSkeleton() { return <div className="flex items-center gap-3 border-b p-6"><Skeleton className="size-12 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div></div> }
