export const metadata = {
  title: 'Customers',
  description: 'Customers in the invoice workspace.',
}

/**
 * The list-only state. The toolbar and the customer list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function CustomersPage() {
  return null
}
