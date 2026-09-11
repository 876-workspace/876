export const metadata = { title: 'Users' }

/**
 * The list-only state. The toolbar, search, and the user list live in the
 * layout, so this route renders nothing of its own — it simply leaves the
 * card slot empty, which is what collapses the second grid column.
 */
export default function UsersPage() {
  return null
}
