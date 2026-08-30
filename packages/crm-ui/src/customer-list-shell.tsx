'use client'

import type { ReactNode } from 'react'
import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'

export type CustomerListShellProps = {
  toolbar: ReactNode
  list: ReactNode
  children: ReactNode
  /** Segments that replace the whole shell with a full-page route. */
  takeoverSegments?: readonly string[]
}

/**
 * Product-level list/detail composition for CRM customer sections.
 *
 * Hosts provide their own toolbar, route-aware list, and detail route so this
 * component remains independent from their routing, data, and authorization.
 */
export function CustomerListShell({
  toolbar,
  list,
  children,
  takeoverSegments,
}: CustomerListShellProps) {
  const { open, takeover } = useListDetailRoute(takeoverSegments)

  if (takeover) return children

  return (
    <ListDetailShell
      open={open}
      toolbar={toolbar}
      list={list}
      detail={children}
    />
  )
}
