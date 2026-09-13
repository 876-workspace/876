import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

type Props = { orgSlug: string }

export function RolesShell({ orgSlug }: Props) {
  return (
    <>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/users`}
        label="Users"
        className="mb-4"
      />
      <ResourceToolbar
        title="Roles"
        titleFilter={
          <StatusFilterHeading
            label="Roles"
            value="all"
            options={[{ value: 'all', label: 'All Roles' }]}
          />
        }
        primaryLabel="Add"
        primaryVariant="info"
        primaryHref={`/${orgSlug}/settings/users/roles/new`}
        refresh
      />
    </>
  )
}
