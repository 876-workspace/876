import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Workspace setup | 876',
  robots: { index: false, follow: false },
}

/** Legacy access-denied URL; the root route now resolves the next destination. */
export default function NoAccessPage() {
  redirect('/')
}
