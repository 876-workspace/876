'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** The edit screen has its own back link and heading, so it hides the detail chrome. */
export function CustomerDetailChromeGate({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  if (pathname?.endsWith('/edit')) return null
  return <>{children}</>
}
