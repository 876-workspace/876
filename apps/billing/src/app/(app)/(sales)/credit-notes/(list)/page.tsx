export const metadata = {
  title: 'Credit Notes',
  description: 'Customer credit notes.',
}

/**
 * The list-only state. The toolbar and the credit note list live in the layout,
 * so this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function CreditNotesPage() {
  return null
}
