import { BarChart3 } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const REPORT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Reports' },
]

export const metadata = {
  title: 'Reports',
  description: 'Commercial performance reports grouped by currency.',
}

export default function ReportsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Reports"
        titleFilter={
          <StatusFilterHeading
            label="Reports"
            value="all"
            options={REPORT_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/reports/new"
        primaryVariant="info"
        refresh
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Outstanding receivables"
          description="Total amount due from customers across open invoices and sales receipts."
          values={[]}
          emptyTitle="No receivables"
          emptyDescription="Create an invoice to begin tracking receivables."
        />
        <ReportCard
          title="Payments received"
          description="Totals from customer payments allocated to invoices."
          values={[]}
          emptyTitle="No payments yet"
          emptyDescription="Record a payment to see settlement totals here."
        />
      </section>
    </Page>
  )
}

function ReportCard({
  title,
  description,
  values,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  values: Array<{ key: string; primary: string; secondary: string }>
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section className="876-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      {values.length === 0 ? (
        <Empty className="border-0 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.key} className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {value.key}
              </p>
              <p className="mt-2 text-lg font-semibold">{value.primary}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {value.secondary}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
