import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { StreamingResourceLoading } from '@/components/patterns/streaming-resource-page'
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
    <StreamingResourceLoading
      title={title}
      status="all"
      options={options}
      primary={primary}
      columns={columns}
    />
  )
}
