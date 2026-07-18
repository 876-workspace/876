import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Locations | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationLocationsLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
