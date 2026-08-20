import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { SearchInputPlaceholder } from '@876/ui/search-input'
import { ORGS_SKELETON_COLUMNS } from '../_components/orgs-skeleton-columns'
import { OrgsToolbar } from '../_components/orgs-toolbar'

export default function Loading() {
  return (
    <Page>
      <OrgsToolbar status="all" />
      <div className="mb-4 w-full max-w-sm">
        <SearchInputPlaceholder placeholder="Search organizations by name or slug…" />
      </div>
      <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} rows={5} />
    </Page>
  )
}
