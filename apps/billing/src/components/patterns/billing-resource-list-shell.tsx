'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResourceListDetailShell } from '@876/ui/resource-list-detail-shell'
import {
  useListDetailRoute,
  type ListDetailListWidth,
} from '@876/ui/list-detail-shell'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import {
  StreamingResourceToolbar,
  type StreamingResourceAction,
} from '@/components/patterns/streaming-resource-toolbar'

const TAKEOVER_SEGMENTS = ['edit'] as const

type Props = {
  title: string
  options: StatusFilterOption[]
  list: ReactNode
  children: ReactNode
  primary?: StreamingResourceAction
  dropdownAction?: StreamingResourceAction
  listWidth?: ListDetailListWidth
}

/** Persistent CRM-style list/detail frame for Billing resource sections. */
export function BillingResourceListShell({
  title,
  options,
  list,
  children,
  primary,
  dropdownAction,
  listWidth,
}: Props) {
  const { open } = useListDetailRoute(TAKEOVER_SEGMENTS)
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'

  return (
    <ResourceListDetailShell
      takeoverSegments={TAKEOVER_SEGMENTS}
      list={list}
      listWidth={listWidth}
      toolbar={
        <StreamingResourceToolbar
          title={title}
          status={status}
          options={options}
          primary={open ? undefined : primary}
          dropdownAction={dropdownAction}
        />
      }
    >
      {children}
    </ResourceListDetailShell>
  )
}
