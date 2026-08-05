'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PageBreadcrumb } from '@876/ui/page'
import { useParams } from 'next/navigation'
import { ACCOUNTS_SKELETON_COLUMNS } from '../_components/accounts-skeleton-columns'

export default function Loading() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing`}
          label="Billing"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">Accounts</h1>
      </div>
      <DataTableSkeleton columns={ACCOUNTS_SKELETON_COLUMNS} />
    </div>
  )
}
