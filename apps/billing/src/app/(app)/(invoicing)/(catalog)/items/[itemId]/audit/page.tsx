import { notFound } from 'next/navigation'

import { resolveItem } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { DetailField } from '@/components/detail-field'
import { formatDate } from '@/lib/format'

export default async function ItemAuditPage({
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
