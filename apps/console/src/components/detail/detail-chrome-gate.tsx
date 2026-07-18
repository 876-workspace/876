'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hides the detail header + tab bar on dedicated sub-pages that should stand
 * alone (currently the `/edit` pages). The edit pages render their own back
 * link and title, so the inherited identity header/tabs would be redundant.
 */
export function DetailChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname?.endsWith('/edit')) return null
  return <>{children}</>
}
