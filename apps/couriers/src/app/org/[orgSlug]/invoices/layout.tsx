import type { ReactNode } from 'react'

export const metadata = { title: 'Invoices' }

export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
