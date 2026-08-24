import type { Metadata } from 'next'

import { BusinessOnboarding } from './_components/business-onboarding'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Set up your business and organization on 876.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function RegisterPage() {
  return <BusinessOnboarding />
}
