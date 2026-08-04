import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

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
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/settings/locations/new`}
        primaryVariant="info"
        refresh
      />
    </>
  )
}
