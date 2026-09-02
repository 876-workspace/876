export const metadata = {
  title: 'Subscriptions',
  description: 'Subscription lifecycle records.',
}

/**
 * The list-only state. The toolbar and the subscription list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function SubscriptionsPage() {
  return null
}
