import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { MetricCard } from '@/components/metric-card'
import { resolveAddon } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatPriceCadence } from '@/lib/format'

export default async function AddonDetailPage({
  params,
}: {
  params: Promise<{ addonId: string }>
}) {
  const { addonId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const addon = await resolveAddon(context.tenant.id, addonId)
  if (!addon) notFound()
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Charge"
          value={formatPriceCadence(addon)}
          detail="Billing behavior"
        />
        <MetricCard
          label="Plans"
          value={addon.planAssociations.length}
          detail="Available plan associations"
        />
        <MetricCard
          label="Prices"
          value={addon._count.prices}
          detail="Immutable price points"
        />
      </div>
      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Add-on information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Code" value={addon.code} mono />
          <DetailField label="Type" value={addon.type.toLowerCase()} />
          <DetailField label="Unit" value={addon.unitName ?? '—'} />
          <DetailField
            label="Tax"
            value={
              addon.isTaxable
                ? `Taxable (${addon.taxCode ?? 'default'})`
                : 'Non-taxable'
            }
          />
          <DetailField
            label="Checkout"
            value={addon.showInCheckout ? 'Visible' : 'Hidden'}
          />
          <DetailField
            label="Customer portal"
            value={
              addon.allowPortalManagement ? 'Customer managed' : 'Staff managed'
            }
          />
          <DetailField label="Updated" value={formatDate(addon.updatedAt)} />
          <DetailField label="Add-on ID" value={addon.id} mono />
        </dl>
      </section>
    </div>
  )
}
