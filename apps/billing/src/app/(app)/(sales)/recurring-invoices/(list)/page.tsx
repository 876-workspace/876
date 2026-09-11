export const metadata = {
  title: 'Recurring Invoices',
  description: 'Invoice schedules generated from reusable templates.',
}

/**
 * The list-only state. The toolbar and the profile list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function RecurringInvoicesPage() {
  return null
}
