import { Accordion, AccordionItem, AccordionTrigger } from '@876/ui/accordion'
import { ChevronDownIcon, ChevronRightIcon } from '@876/ui/icons'

const BASE_SECTIONS = [
  'Invoices',
  'Quotes',
  'Recurring invoices',
  'Credit notes',
  'Projects',
  'Expenses',
]

const SUBSCRIPTIONS_SECTION = 'Subscriptions'

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
      {sections.map((label) => (
        <section
          key={label}
          className="876-card overflow-hidden rounded-lg shadow-none!"
        >
          <AccordionItem value={label.toLowerCase()} className="border-b-0">
            <AccordionTrigger className="items-center px-4 py-4 hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden">
              <span className="flex items-center gap-3">
                <ChevronRightIcon className="text-muted-foreground size-4 group-aria-expanded/accordion-trigger:hidden" />
                <ChevronDownIcon className="text-muted-foreground hidden size-4 group-aria-expanded/accordion-trigger:inline" />
                <span className="text-sm font-semibold">{label}</span>
              </span>
            </AccordionTrigger>
          </AccordionItem>
        </section>
      ))}
    </Accordion>
  )
}
