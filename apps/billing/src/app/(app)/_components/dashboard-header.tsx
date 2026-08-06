import { PageDescription, PageHeader, PageTitle } from '@876/ui/page'

export function DashboardHeader() {
  return (
    <PageHeader className="mb-8">
      <p className="text-brand mb-2 text-xs font-semibold tracking-widest uppercase">
        Workspace Overview
      </p>
      <PageTitle className="text-3xl font-extrabold tracking-tight">
        Dashboard
      </PageTitle>
      <PageDescription className="text-muted-foreground mt-2 text-lg">
        Monitor your commercial performance, active subscriptions, and
        outstanding receivables.
      </PageDescription>
    </PageHeader>
  )
}
