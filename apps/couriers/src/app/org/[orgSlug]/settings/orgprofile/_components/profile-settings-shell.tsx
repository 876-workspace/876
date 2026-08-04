import { PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

type Props = { orgSlug: string }

export function ProfileSettingsShell({ orgSlug }: Props) {
  return (
    <>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />
      <PageHeader className="mb-6">
        <PageTitle>Organization profile</PageTitle>
      </PageHeader>
    </>
  )
}
