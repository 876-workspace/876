'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'

export default function Loading() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="876-page-title">Billing customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Billing-owned customer records.
          </p>
        </div>
        <Button render={<Link href={`/orgs/${slug}/billing/customers/new`} />}>
          Add customer
        </Button>
      </div>
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />
    </div>
  )
}
