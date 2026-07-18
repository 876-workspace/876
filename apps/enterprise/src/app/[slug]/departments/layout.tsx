import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Departments | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationDepartmentsLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
