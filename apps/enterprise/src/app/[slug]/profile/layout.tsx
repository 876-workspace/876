import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Profile | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationProfileLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
