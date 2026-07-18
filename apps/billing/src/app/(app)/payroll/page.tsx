import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = {
  title: 'Payroll',
}

export default function PayrollPage() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Payroll</PageTitle>
        <PageDescription>
          Manage your team&apos;s payroll and compensation.
        </PageDescription>
      </PageHeader>
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          Payroll features coming soon.
        </p>
      </div>
    </Page>
  )
}
