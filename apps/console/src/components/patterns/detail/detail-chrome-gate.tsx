'use client'

import { type ReactElement } from 'react'
import { usePathname } from 'next/navigation'

type Props = {
  children: ReactElement
  /** The record's own edit route. */
  editHref?: string
  /**
   * Compact header shown instead of the record chrome on `editHref`, so the
   * edit form replaces the record inside the same card rather than leaving it.
   */
  editChrome?: ReactElement
}

/**
 * Swaps the detail header + tab bar on `/edit` pages. The record's own edit
 * route gets `editChrome`; any other edit page renders its own back link and
 * title, so the chrome is hidden.
 */
export function DetailChromeGate({ children, editHref, editChrome }: Props) {
  const pathname = usePathname()
  if (editChrome && pathname === editHref) return editChrome
  if (pathname?.endsWith('/edit')) return null

  return children
}
