import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CustomerContactsPanelSkeleton } from '@876/billing-ui/panels/customer-contacts-panel'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { CustomerContacts } from './_components/customer-contacts'

export const metadata: Metadata = {
  title: 'Customer',
  description: 'Customer details.',
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  return (
    <Suspense fallback={<CustomerContactsPanelSkeleton />}>
      <CustomerContactsData params={params} />
    </Suspense>
  )
}

async function CustomerContactsData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) return null
  const billing = await getBilling(context.orgId)
  const result = await billing.customers.contacts.list(customerId)
  const state = result.error
    ? { status: 'error' as const, error: result.error }
    : result.data.data.length
      ? { status: 'ready' as const, data: result.data.data }
      : { status: 'empty' as const }
  return (
    <CustomerContacts
      customerId={customerId}
      state={state}
      canManage={context.role !== 'staff'}
    />
  )
}
