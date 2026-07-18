import { CreditCard } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'

export const metadata = {
  title: 'Expenses',
  description: 'Manage your purchases and expenses.',
}

const EXPENSE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Expenses' },
]

export default async function ExpensesPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Expenses"
        titleFilter={
          <StatusFilterHeading
            label="Expenses"
            value="all"
            options={EXPENSE_STATUS_OPTIONS}
          />
        }
        primaryLabel="New Expense"
        primaryVariant="info"
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCard />
          </EmptyMedia>
          <EmptyTitle>No expenses yet</EmptyTitle>
          <EmptyDescription>
            Expenses will appear here when you add them.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
