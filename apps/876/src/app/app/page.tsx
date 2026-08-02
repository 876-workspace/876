import type { Metadata } from 'next'

import { AccountPage } from '@/features/account/components/account-page'

export const metadata: Metadata = {
  title: 'Home | 876',
  robots: { index: false, follow: false },
}

export default function ConsumerHomePage() {
  return <AccountPage title="Home" />
}
