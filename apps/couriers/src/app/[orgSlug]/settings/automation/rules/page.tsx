import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'Workflow rules — Settings' }

export default async function WorkflowRulesSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Workflow rules</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
