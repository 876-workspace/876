import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

import { resolveCustomer } from '../_lib/customer-data'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function CustomerOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<CustomerOverviewFallback />}>
      <CustomerOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function CustomerOverviewFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function factValue(value: string | null) {
  return value || <span className="text-muted-foreground">&mdash;</span>
}

async function CustomerOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) notFound()

  const { profile, identity, mailbox, branch } = customer
  const name = identity?.name || profile.billingCustomerId

  return (
    <div className="space-y-6">
      <DetailCardSection title="Identity">
        <DetailCardFacts>
          <DetailCardFact label="Name" value={factValue(name)} />
          <DetailCardFact
            label="Company"
            value={factValue(identity?.companyName ?? null)}
          />
          <DetailCardFact
            label="Email"
            value={factValue(identity?.email ?? null)}
          />
          <DetailCardFact
            label="Phone"
            value={factValue(identity?.phone ?? null)}
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Courier details">
        <DetailCardFacts>
          <DetailCardFact
            label="Mailbox"
            value={factValue(mailbox?.number ?? null)}
          />
          <DetailCardFact
            label="Home branch"
            value={factValue(branch?.name ?? null)}
          />
          <DetailCardFact label="TRN" value={factValue(profile.trn)} mono />
          <DetailCardFact
            label="Commercial"
            value={profile.isCommercial ? 'Yes' : 'No'}
          />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
