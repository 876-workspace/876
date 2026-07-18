import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Wallet & Subscriptions | 876',
  robots: { index: false, follow: false },
}

export default function WalletSubscriptionsRedirectPage() {
  redirect('/app/wallet-subscriptions')
}
