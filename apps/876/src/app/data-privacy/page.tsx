import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Data & Privacy | 876',
  robots: { index: false, follow: false },
}

export default function DataPrivacyRedirectPage() {
  redirect('/app/data-privacy')
}
