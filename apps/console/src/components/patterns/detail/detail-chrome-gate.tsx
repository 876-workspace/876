'use client'

import { type ReactElement } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hides the detail header + tab bar on `/edit` pages, which render their own
 * back link and title.
 */
export function DetailChromeGate({ children }: { children: ReactElement }) {
  const pathname = usePathname()
  if (pathname?.endsWith('/edit')) return null

  return children
}
