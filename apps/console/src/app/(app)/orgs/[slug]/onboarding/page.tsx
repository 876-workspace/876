import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveOrg } from '../_data'
import { OnboardingEditor } from './onboarding-editor'

type Props = { params: Promise<{ slug: string }> }

export default async function OrganizationOnboardingPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [catalogResult, sessionResult] = await Promise.all([
    $876.onboarding.retrieveCatalog('organization', 'global', 'JM'),
    $876.onboarding.retrieve(org.id, 'organization', 'global', 'JM'),
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
