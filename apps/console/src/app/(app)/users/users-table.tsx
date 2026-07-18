'use client'

import { useRouter } from 'next/navigation'
import type { AdminUser, AdminUserApp } from '@876/admin'
import { DataTable } from '@876/ui/data-table'

import { CursorPagination } from '@/components/cursor-pagination'

import { makeUserColumns } from './columns'

type Props = {
  data: AdminUser[]
  enrollmentsMap: Record<string, AdminUserApp[]>
  isSearching: boolean
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

export function UsersTable({
  data,
  enrollmentsMap,
  isSearching,
  hasMore,
  firstId,
  lastId,
}: Props) {
  const router = useRouter()
  const columns = makeUserColumns(enrollmentsMap)

  return (
    <div className="876-card">
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(user) => router.push(`/users/${user.username ?? user.id}`)}
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
