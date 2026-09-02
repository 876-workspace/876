export const metadata = {
  title: 'Quotes',
  description: 'Sales proposals and their line snapshots.',
}

/**
 * The list-only state. The toolbar and the quote list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function QuotesPage() {
  return null
}
