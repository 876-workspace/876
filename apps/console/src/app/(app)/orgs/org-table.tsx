'use client'

import { useRouter } from 'next/navigation'
import type { AdminOrganization, AdminSubscription } from '@876/admin'
import { DataTable } from '@876/ui/data-table'

import { CursorPagination } from '@/components/cursor-pagination'

import { buildOrgColumns } from './columns'

type Props = {
  data: AdminOrganization[]
  subscriptionsMap: Record<string, AdminSubscription[]>
  isSearching: boolean
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

export function OrgTable({
  data,
  subscriptionsMap,
  isSearching,
  hasMore,
  firstId,
  lastId,
}: Props) {
  const router = useRouter()
  const columns = buildOrgColumns(subscriptionsMap)

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(org) => router.push(`/orgs/${org.slug}`)}
      />
      {!isSearching && (
        <CursorPagination
          firstId={firstId}
          lastId={lastId}
          hasMore={hasMore}
          count={data.length}
        />
      )}
    </div>
  )
}
