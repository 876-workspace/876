export const metadata = {
  title: 'Estimates',
  description: 'Sales estimates and their line snapshots.',
}

/**
 * The list-only state. The toolbar and the estimate list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function EstimatesPage() {
  return null
}
