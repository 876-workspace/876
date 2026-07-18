import { Page, PageBreadcrumb } from '@876/ui/page'

export const metadata = { title: 'Billing — Settings' }

export default async function BillingSettingsPage({
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
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your plan, usage, and payment history.
        </p>
      </div>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
