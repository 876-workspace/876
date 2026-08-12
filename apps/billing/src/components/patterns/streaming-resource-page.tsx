import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import {
  StreamingResourceToolbar,
  type StreamingResourceAction,
} from './streaming-resource-toolbar'

type Props = {
  children: ReactNode
  columns: DataTableSkeletonColumn[]
  dropdownAction?: StreamingResourceAction
  options: StatusFilterOption[]
  primary?: StreamingResourceAction
  status: string
  title: string
}

export function StreamingResourcePage({
  children,
  columns,
  ...toolbar
}: Props) {
  return (
    <Page>
      <StreamingResourceToolbar {...toolbar} />
      <Suspense fallback={<DataTableSkeleton columns={columns} rows={5} />}>
        {children}
      </Suspense>
    </Page>
  )
}

export function StreamingResourceLoading({
  columns,
  ...toolbar
}: Omit<Props, 'children'>) {
  return (
    <Page>
      <StreamingResourceToolbar {...toolbar} />
      <DataTableSkeleton columns={columns} rows={5} />
    </Page>
  )
}
