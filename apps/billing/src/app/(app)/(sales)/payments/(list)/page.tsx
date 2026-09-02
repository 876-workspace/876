export const metadata = {
  title: 'Payments Received',
  description: 'Customer payments allocated to invoices.',
}

/**
 * The list-only state. The toolbar and the payment list live in the layout, so
 * this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function PaymentsPage() {
  return null
}
