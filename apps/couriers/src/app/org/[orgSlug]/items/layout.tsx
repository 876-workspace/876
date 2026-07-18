import type { ReactNode } from 'react'

export const metadata = { title: 'Items' }

export default function ItemsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
