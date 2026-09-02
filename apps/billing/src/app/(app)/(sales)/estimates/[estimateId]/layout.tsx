import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/patterns/detail/detail-layout'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import type { LegacyBillingRecord } from '@/lib/service'
import { resolveEstimate } from '@/app/(app)/_lib/detail-data'

export default async function EstimateDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ estimateId: string }>
}) {
  const { estimateId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const estimate: LegacyBillingRecord | null = await resolveEstimate(
    context.tenant.id,
    estimateId
  )
  if (!estimate) notFound()

  const base = `/estimates/${estimate.id}`

  return (
    <DetailLayout
      backHref="/estimates"
      backLabel="Estimates"
      eyebrow="Sales estimate"
      title={estimate.number}
      description={`${estimate.customer.name} · ${formatMoney(estimate.totalAmount, estimate.currency)}`}
      status={estimate.status.toLowerCase().replace(/_/g, ' ')}
      statusVariant={
        estimate.status === 'ACCEPTED'
          ? 'success'
          : estimate.status === 'SENT'
            ? 'info'
            : 'secondary'
      }
      tabs={[{ label: 'Overview', href: base, exact: true }]}
      recordId={estimate.id}
    >
      {children}
    </DetailLayout>
  )
}
