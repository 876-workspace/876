import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { ChevronDownIcon, ChevronRightIcon } from '@876/ui/icons'

const BASE_SECTIONS = [
  {
    label: 'Invoices',
    columns: ['Invoice', 'Customer', 'Total', 'Amount due', 'Status'],
  },
  {
    label: 'Quotes',
    columns: ['Quote', 'Customer', 'Total', 'Status', 'Invoice'],
  },
  {
    label: 'Recurring invoices',
    columns: [
      'Recurring invoice',
      'Customer',
      'Amount',
      'Status',
      'Next invoice',
    ],
  },
  {
    label: 'Credit notes',
    columns: ['Number', 'Customer', 'Status', 'Total', 'Balance'],
  },
  {
    label: 'Projects',
    columns: ['Project', 'Status', 'Progress', 'Due date', 'Updated'],
  },
  {
    label: 'Expenses',
    columns: ['Expense', 'Vendor', 'Category', 'Amount', 'Date', 'Status'],
  },
]

const SUBSCRIPTIONS_SECTION = {
  label: 'Subscriptions',
  columns: [
    'Product & plan',
    'Recurring amount',
    'Status',
    'Renews / ends',
    'Created',
  ],
}

type EmptyRow = { id: string }

function CustomerTransactionTable({
  columns,
  label,
}: {
  columns: string[]
  label: string
}) {
  const tableColumns: ColumnDef<EmptyRow, unknown>[] = columns.map(
    (column) => ({
      id: column,
      header: column,
    })
  )

  return (
    <div className="876-scroll overflow-x-auto">
      <DataTable
        columns={tableColumns}
        data={[]}
        emptyState={
          <span className="text-muted-foreground">
            No {label.toLowerCase()} found.
          </span>
        }
      />
    </div>
  )
}

export function CustomerTransactionsAccordions({
  includeSubscriptions = false,
}: {
  includeSubscriptions?: boolean
}) {
  const sections = includeSubscriptions
    ? [
        ...BASE_SECTIONS.slice(0, 3),
        SUBSCRIPTIONS_SECTION,
        ...BASE_SECTIONS.slice(3),
      ]
    : BASE_SECTIONS

  return (
    <Accordion multiple={false} className="gap-3">
      {sections.map((section) => (
        <section
          key={section.label}
          className="border-876-surface-border overflow-hidden rounded-lg border"
        >
          <AccordionItem
            value={section.label.toLowerCase()}
            className="border-b-0"
          >
            <AccordionTrigger className="bg-876-canvas aria-expanded:bg-876-surface aria-expanded:border-876-surface-border items-center rounded-none border-b border-transparent px-4 py-3 transition-colors hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden">
              <span className="flex items-center gap-3">
                <ChevronRightIcon className="text-muted-foreground size-4 group-aria-expanded/accordion-trigger:hidden" />
                <ChevronDownIcon className="text-muted-foreground hidden size-4 group-aria-expanded/accordion-trigger:inline" />
                <span className="text-sm font-semibold">{section.label}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-876-surface p-0">
              <CustomerTransactionTable
                columns={section.columns}
                label={section.label}
              />
            </AccordionContent>
          </AccordionItem>
        </section>
      ))}
    </Accordion>
  )
}
