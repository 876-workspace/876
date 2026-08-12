'use client'

import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import type { Permission } from '@/types/access'

export function SalesListLoading({
  title,
  options,
  primary,
  columns,
}: {
  title: string
  options: StatusFilterOption[]
  primary: { label: string; href: string; permission: Permission }
  columns: DataTableSkeletonColumn[]
}) {
  return (
    <Page>
      <StreamingResourceToolbar
        title={title}
        status="all"
        options={options}
        primary={primary}
      />
      <DataTableSkeleton columns={columns} rows={5} />
    </Page>
  )
}
