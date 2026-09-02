export const metadata = {
  title: 'Vendors',
  description: 'Manage your vendors and suppliers.',
}

/**
 * The list-only state. The toolbar and the vendor list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function VendorsPage() {
  return null
}
