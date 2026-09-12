import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { resolveItem } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export const metadata: Metadata = {
  title: 'Transactions',
}

export default function ItemTransactionsPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  return (
    <Suspense fallback={<ItemTransactionsSkeleton />}>
      <ItemTransactionsData params={params} />
    </Suspense>
  )
}

async function ItemTransactionsData({
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

function ItemTransactionsSkeleton() {
  return (
    <div
      className="876-card flex min-h-32 items-center justify-center p-8"
      aria-label="Loading item transactions"
    >
      <Skeleton className="h-4 w-52" />
    </div>
  )
}