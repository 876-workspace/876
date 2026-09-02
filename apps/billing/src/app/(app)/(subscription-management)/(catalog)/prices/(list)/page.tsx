export const metadata = {
  title: 'Prices',
  description: 'Pricing records and configurations.',
}

/**
 * The list-only state. The toolbar and the list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function PricesPage() {
  return null
}
