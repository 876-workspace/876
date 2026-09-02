export const metadata = {
  title: 'Invoices',
  description: 'Commercial invoice drafts.',
}

/**
 * The list-only state. The toolbar and the invoice list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function InvoicesPage() {
  return null
}
