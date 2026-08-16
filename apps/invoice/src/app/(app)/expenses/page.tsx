import { CreditCard } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { ExpensesTable } from './_components/expenses-table'

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
        primaryLabel="New"
        primaryHref="/expenses/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Expense', cell: 'avatar' as const },
              { label: 'Vendor' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <ExpensesTableData />
      </Suspense>
    </Page>
  )
}

async function ExpensesTableData() {
  // Expenses are not yet backed by a dedicated invoice-plane resource — render empty with ability to add columns later.
  return (
    <ExpensesTable
      expenses={[]}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard />
            </EmptyMedia>
            <EmptyTitle>No expenses yet</EmptyTitle>
            <EmptyDescription>
              Expenses will appear here when you add them. Columns can be
              adjusted later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
