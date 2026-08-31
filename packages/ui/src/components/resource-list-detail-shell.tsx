'use client'

import type { ReactNode } from 'react'

import {
  ListDetailShell,
  type ListDetailListWidth,
  useListDetailRoute,
} from './list-detail-shell'
import { Page } from './page'

type Props = {
  children: ReactNode
  list: ReactNode
  toolbar?: ReactNode
  subnav?: ReactNode
  takeoverSegments?: readonly string[]
  listWidth?: ListDetailListWidth
}

/**
 * Product-agnostic host frame for a persistent resource list and right-hand
 * record card. Host apps own their toolbar, routes, auth and data; this shared
 * frame only implements the CRM-style interaction contract.
 */
export function ResourceListDetailShell({
  children,
  list,
  toolbar,
  subnav,
  takeoverSegments = ['edit'],
  listWidth = 'wide',
}: Props) {
  const { open, takeover } = useListDetailRoute(takeoverSegments)

  if (takeover) return children

  return (
    <Page className="h-full min-h-0">
      <ListDetailShell
        open={open}
        toolbar={toolbar}
        subnav={subnav}
        list={list}
        listWidth={listWidth}
        detail={
          <div className="876-card h-full min-h-0 overflow-y-auto">
            {children}
          </div>
        }
      />
    </Page>
  )
}
