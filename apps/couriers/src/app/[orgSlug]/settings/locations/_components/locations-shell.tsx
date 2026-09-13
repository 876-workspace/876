import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

type Props = { orgSlug: string }

export function LocationsShell({ orgSlug }: Props) {
  return (
    <>
      <PageBreadcrumb
        href={`/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />
      <ResourceToolbar
        title="Locations"
        titleFilter={
          <StatusFilterHeading
            label="Locations"
            value="all"
            options={[{ value: 'all', label: 'All Locations' }]}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/settings/locations/new`}
        primaryVariant="info"
        refresh
      />
    </>
  )
}
