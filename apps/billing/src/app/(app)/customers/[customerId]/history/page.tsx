import { notFound } from 'next/navigation'

import { resolveCustomer } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function CustomerHistoryPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  return (
    <div className="876-card text-muted-foreground p-8 text-center text-sm">
      History for {customer.name} will appear here.
    </div>
  )
}
