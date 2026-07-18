import type { Metadata } from 'next'

import { AccountPage } from '@/components/account/account-page'
import { requireConsumerFeature } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Wallet & Subscriptions | 876',
  robots: { index: false, follow: false },
}

export default async function WalletSubscriptionsPage() {
  await requireConsumerFeature('wallet')

  return <AccountPage title="Wallet & subscriptions" />
}
