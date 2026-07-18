import { Page, PageHeader, PageTitle } from '@876/ui/page'

export default function PackagesPage() {
  return (
    <Page>
      <PageHeader className="mb-8">
        <PageTitle>Packages</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed">No packages yet.</div>
    </Page>
  )
}
