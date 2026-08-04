import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { SearchInputPlaceholder } from '@876/ui/search-input'
import { ORGS_SKELETON_COLUMNS } from './_components/orgs-skeleton-columns'
import { OrgsToolbar } from './_components/orgs-toolbar'

export default function Loading() {
  return (
    <Page>
      <OrgsToolbar status="all" />
      {/* Mirrors the control row in page.tsx — search on the left, provisioning
          link on the right. Without it the table sits one row higher here than
          in the resolved page and jumps down on hand-off. The link stays live:
          its destination is static, so there is nothing to wait for. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <SearchInputPlaceholder placeholder="Search organizations by name or slug…" />
        </div>
        <Link
          href="/orgs/provisioning"
          className={buttonVariants({ variant: 'outline' })}
        >
          Provisioning defaults
        </Link>
      </div>
      <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} />
    </Page>
  )
}
