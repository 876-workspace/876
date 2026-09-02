export const metadata = {
  title: 'Items',
  description: 'Catalog items and services.',
}

/**
 * The list-only state. The toolbar and the item list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function ItemsPage() {
  return null
}
