export const metadata = { title: 'Price Lists' }

/**
 * The list-only state. The toolbar and the price-list column live in the
 * layout, so this route renders nothing of its own — it simply leaves the card
 * slot empty, which is what collapses the second grid column.
 */
export default function PriceListsPage() {
  return null
}
