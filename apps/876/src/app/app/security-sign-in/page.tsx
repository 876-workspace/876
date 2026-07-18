import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Security | 876',
  robots: { index: false, follow: false },
}

export default function SecuritySignInRedirectPage() {
  redirect('/app/security-sign-in')
}
