import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'Custom fields — Settings' }

export default async function CustomFieldsSettingsPage({
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

      <PageHeader className="mb-8">
        <PageTitle>Custom fields</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
