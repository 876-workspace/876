import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Password | 876',
  robots: { index: false, follow: false },
}

export default function PasswordRedirectPage() {
  redirect('/app/password')
}
