'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export function DetailChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname?.endsWith('/edit')) return null
  return <>{children}</>
}
