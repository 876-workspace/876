import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Developer Apps | 876',
  robots: { index: false, follow: false },
}

export default function DeveloperAppsRedirectPage() {
  redirect('/app/developer/apps')
}
