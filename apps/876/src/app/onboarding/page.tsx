import type { Metadata } from 'next'

import { BusinessOnboardingFlow } from './onboarding-flow'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create your organization',
  description: 'Set up your business workspace on 876.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function OnboardingPage() {
  return <BusinessOnboardingFlow />
}
