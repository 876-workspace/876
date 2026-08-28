'use client'

import React, { type ReactElement } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Manages the detail header + tab bar presentation on dedicated sub-pages:
 * - Hides on `/edit` pages (which render their own back link and title).
 * - Condenses on `/workspace/*` sub-pages (e.g. `/orgs/[slug]/workspace/crm/*`)
 *   so that the app workspace content is not pushed down.
 */
export function DetailChromeGate({
  children,
}: {
  children: ReactElement<{ condensed?: boolean }>
}) {
  const pathname = usePathname()
  if (pathname?.endsWith('/edit')) return null

  const isWorkspaceSubpage = Boolean(pathname?.includes('/workspace/'))
  if (isWorkspaceSubpage && React.isValidElement(children)) {
    return React.cloneElement(children, { condensed: true })
  }

  return children
}
