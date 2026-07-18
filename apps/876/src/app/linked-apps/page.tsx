import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Linked Apps | 876',
  robots: { index: false, follow: false },
}

export default function LinkedAppsRedirectPage() {
  redirect('/app/linked-apps')
}
