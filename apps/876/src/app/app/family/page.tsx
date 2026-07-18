import type { Metadata } from 'next'

import { AccountPage } from '@/components/account/account-page'
import { requireConsumerFeature } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Family | 876',
  robots: { index: false, follow: false },
}

export default async function FamilyPage() {
  await requireConsumerFeature('family')

  return <AccountPage title="Family" />
}
