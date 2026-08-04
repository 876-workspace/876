import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

type Props = { orgSlug: string }

export function RolesShell({ orgSlug }: Props) {
  return (
    <>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/users`}
        label="Users"
        className="mb-4"
      />
      <ResourceToolbar
        title="Roles"
        primaryLabel="Add"
        primaryVariant="info"
        primaryHref={`/org/${orgSlug}/settings/users/roles/new`}
        refresh
      />
    </>
  )
}
