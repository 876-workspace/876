import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Workspace setup | 876',
  robots: { index: false, follow: false },
}

/** Legacy realm-gate URL; Enterprise now keeps setup within this app. */
export default function AccessDeniedPage() {
  redirect('/register')
}
