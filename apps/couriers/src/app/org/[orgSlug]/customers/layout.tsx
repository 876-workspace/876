import type { ReactNode } from 'react'

export const metadata = { title: 'Customers' }

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
