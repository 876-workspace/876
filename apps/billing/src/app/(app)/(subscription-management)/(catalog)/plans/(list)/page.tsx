export const metadata = {
  title: 'Plans',
  description: 'Subscription plans and pricing.',
}

/**
 * The list-only state. The toolbar and the list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function PlansPage() {
  return null
}
