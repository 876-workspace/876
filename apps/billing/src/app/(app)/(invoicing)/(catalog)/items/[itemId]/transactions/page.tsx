import { notFound } from 'next/navigation'

import { resolveItem } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function ItemTransactionsPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const item = await resolveItem(context.tenant.id, itemId)
  if (!item) notFound()

  return (
    <div className="876-card text-muted-foreground p-8 text-center text-sm">
      This item has no transactions yet.
    </div>
  )
}
