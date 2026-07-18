import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Family | 876',
  robots: { index: false, follow: false },
}

export default function FamilyRedirectPage() {
  redirect('/app/family')
}
