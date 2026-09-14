import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { formatDate } from '@876/core/timestamps'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { packageStatusLabel } from '../_lib/packages-list-config'
import { resolvePackage } from './_lib/package-data'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function PackageOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<PackageOverviewFallback />}>
      <PackageOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function PackageOverviewFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function value(next: string | number | null | undefined) {
  return next === null || next === undefined || next === '' ? (
    <span className="text-muted-foreground">&mdash;</span>
  ) : (
    String(next)
  )
}

async function PackageOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const resolved = await resolvePackage(orgSlug, id)
  if (!resolved) notFound()

  const { pkg, customerName, branch } = resolved

  return (
    <div className="space-y-6">
      <DetailCardSection title="Package">
        <DetailCardFacts>
          <DetailCardFact
            label="Tracking number"
            value={value(pkg.tracking_num)}
            mono
          />
          <DetailCardFact
            label="Status"
            value={packageStatusLabel(pkg.status)}
          />
          <DetailCardFact label="Category" value={value(pkg.category?.name)} />
          <DetailCardFact label="Type" value={pkg.package_type} />
          <DetailCardFact label="Quantity" value={pkg.quantity} />
          <DetailCardFact
            label="Actual weight"
            value={
              pkg.actual_weight === null ? value(null) : `${pkg.actual_weight} lb`
            }
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Routing">
        <DetailCardFacts>
          <DetailCardFact label="Customer" value={customerName} />
          <DetailCardFact label="Branch" value={value(branch?.name)} />
          <DetailCardFact label="Mailbox ID" value={value(pkg.mailbox_id)} mono />
          <DetailCardFact
            label="Description"
            value={value(pkg.description)}
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Dates">
        <DetailCardFacts>
          <DetailCardFact label="Added" value={formatDate(pkg.created_at)} />
          <DetailCardFact label="Updated" value={formatDate(pkg.updated_at)} />
          <DetailCardFact
            label="Collected"
            value={
              pkg.collected_at === null
                ? value(null)
                : formatDate(pkg.collected_at)
            }
          />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
