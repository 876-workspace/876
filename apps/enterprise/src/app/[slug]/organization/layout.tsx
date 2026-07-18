import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Organization | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationDetailsLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
