import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'
import type { LegacyBillingRecord } from '@/lib/service'
import { resolveVendor } from '@/app/(app)/_lib/detail-data'

interface Props {
  params: Promise<{ vendorId: string }>
}

export const metadata: Metadata = {
  title: 'Vendor details',
  description: 'Vendor contact and billing details.',
}

export default async function VendorDetailPage({ params }: Props) {
  const { vendorId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const vendor: LegacyBillingRecord | null = await resolveVendor(
    context.tenant.id,
    vendorId
  )
  if (!vendor) notFound()

  return (
    <DetailCardSection title="Vendor information">
      <DetailCardFacts>
        <DetailCardFact label="Name" value={vendor.name} />
        <DetailCardFact label="Status" value={vendor.status.toLowerCase()} />
        <DetailCardFact label="Email" value={vendor.email ?? '—'} />
        <DetailCardFact label="Phone" value={vendor.phone ?? '—'} />
        <DetailCardFact
          label="Reference"
          value={vendor.externalReference ?? '—'}
          mono
        />
        <DetailCardFact
          label="Currency"
          value={vendor.defaultCurrency ?? '—'}
          mono
        />
        <DetailCardFact label="Created" value={formatDate(vendor.createdAt)} />
        <DetailCardFact label="Updated" value={formatDate(vendor.updatedAt)} />
      </DetailCardFacts>
    </DetailCardSection>
  )
}
