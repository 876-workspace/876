import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'People & Sharing | 876',
  robots: { index: false, follow: false },
}

export default function PeopleSharingRedirectPage() {
  redirect('/app/people-sharing')
}
