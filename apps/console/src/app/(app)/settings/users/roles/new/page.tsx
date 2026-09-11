import { NewRoleCard } from './_components/new-role-card'

export const metadata = { title: 'New Role - Roles' }

/**
 * Create owns the whole content area — the toolbar and list stand down while
 * the form is open, and the sidebar stays on Roles.
 */
export default function NewRolePage() {
  return <NewRoleCard />
}
