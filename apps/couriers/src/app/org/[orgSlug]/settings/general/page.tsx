import { Page, PageBreadcrumb } from '@876/ui/page'

export const metadata = { title: 'General — Settings' }

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">General</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Workspace configuration and regional defaults.
        </p>
      </div>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
