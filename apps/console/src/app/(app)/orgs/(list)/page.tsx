export const metadata = { title: 'Organizations' }

/**
 * The list-only state. The toolbar, search, and the organization list live in
 * the layout, so this route renders nothing of its own — it simply leaves the
 * card slot empty, which is what collapses the second grid column.
 */
export default function OrganizationsPage() {
  return null
}
