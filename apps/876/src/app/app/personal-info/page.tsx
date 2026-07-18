import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Personal Info | 876',
  robots: { index: false, follow: false },
}

export default function PersonalInfoRedirectPage() {
  redirect('/app/personal-info')
}
