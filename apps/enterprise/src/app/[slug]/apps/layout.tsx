import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Apps | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationAppsLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
