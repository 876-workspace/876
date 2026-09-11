export const metadata = { title: 'Plans' }

/**
 * The list-only state. The toolbar, search, and the plans list live in the
 * layout, so this route renders nothing of its own — it simply leaves the
 * card slot empty, which is what collapses the second grid column.
 */
export default function AppPlansPage() {
  return null
}
