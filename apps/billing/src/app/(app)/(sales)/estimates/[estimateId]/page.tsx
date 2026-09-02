import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeadline,
  DetailCardSection,
} from '@876/ui/detail-card'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import type { LegacyBillingRecord } from '@/lib/service'
import { resolveEstimate } from '@/app/(app)/_lib/detail-data'

interface Props {
  params: Promise<{ estimateId: string }>
}

export const metadata: Metadata = {
  title: 'Estimate details',
  description: 'Estimate totals, customer, and dates.',
}

export default async function EstimateDetailPage({ params }: Props) {
  const { estimateId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const estimate: LegacyBillingRecord | null = await resolveEstimate(
    context.tenant.id,
    estimateId
  )
  if (!estimate) notFound()

  return (
    <>
      <DetailCardHeadline
        value={formatMoney(estimate.totalAmount, estimate.currency)}
        caption={`Total · ${estimate.currency}`}
        className="mb-6"
      />
      <DetailCardSection title="Estimate information">
        <DetailCardFacts>
          <DetailCardFact label="Customer" value={estimate.customer.name} />
          <DetailCardFact
            label="Status"
            value={estimate.status.toLowerCase().replace(/_/g, ' ')}
          />
          <DetailCardFact
            label="Subtotal"
            value={formatMoney(estimate.subtotalAmount, estimate.currency)}
            mono
          />
          <DetailCardFact
            label="Tax"
            value={formatMoney(estimate.taxAmount, estimate.currency)}
            mono
          />
          <DetailCardFact label="Currency" value={estimate.currency} mono />
          <DetailCardFact label="Issued" value={formatDate(estimate.issueAt)} />
          <DetailCardFact
            label="Expires"
            value={formatDate(estimate.expiresAt)}
          />
          <DetailCardFact
            label="Created"
            value={formatDate(estimate.createdAt)}
          />
          <DetailCardFact
            label="Updated"
            value={formatDate(estimate.updatedAt)}
          />
        </DetailCardFacts>
      </DetailCardSection>
    </>
  )
}
