import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { resolveItem } from '@/app/(app)/_lib/detail-data'
import { DetailField } from '@/components/patterns/detail/detail-field'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'

export default function ItemAuditPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  return (
    <Suspense fallback={<ItemAuditSkeleton />}>
      <ItemAuditData params={params} />
    </Suspense>
  )
}

async function ItemAuditData({
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
    <div className="space-y-6">
      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Audit trail</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Created at" value={formatDate(item.createdAt)} />
          <DetailField label="Updated at" value={formatDate(item.updatedAt)} />
        </dl>
      </section>
    </div>
  )
}

function ItemAuditSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading item audit trail">
      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Audit trail</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField
            label="Created at"
            value={<Skeleton className="h-4 w-28" />}
          />
          <DetailField
            label="Updated at"
            value={<Skeleton className="h-4 w-28" />}
          />
        </dl>
      </section>
    </div>
  )
}
