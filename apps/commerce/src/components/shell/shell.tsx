import type { ReactNode } from 'react'
import Link from 'next/link'
import { COMMERCE_APP_NAME } from '@/lib/commerce-app'
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <Link href="/" className="font-semibold">
          {COMMERCE_APP_NAME}
        </Link>
        <nav className="mt-2 text-sm">
          <Link href="/">Home</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
