import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { workspace } from '@/lib/876'
import { resolveOrg } from '../_data'
import { OnboardingEditor } from './_components/onboarding-editor'

type Props = { params: Promise<{ slug: string }> }

export default function OrganizationOnboardingPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <OrganizationOnboardingData params={params} />
    </Suspense>
  )
}

async function OrganizationOnboardingData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [catalogResult, sessionResult] = await Promise.all([
    workspace.onboarding.retrieveCatalog('organization', 'global', 'JM'),
    workspace.onboarding.retrieve(org.id, 'organization', 'global', 'JM'),
  ])
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load onboarding catalog.'
    )
  if (sessionResult.error || !sessionResult.data)
    throw new Error(
      sessionResult.error?.message ?? 'Failed to load onboarding session.'
    )

  return (
    <OnboardingEditor
      organizationId={org.id}
      catalog={catalogResult.data}
      session={sessionResult.data}
    />
  )
}
