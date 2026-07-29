import type { ReactNode } from 'react'

export const metadata = { title: 'Deliveries' }

export default function DeliveriesLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
