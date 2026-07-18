import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'People | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationPeopleLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
