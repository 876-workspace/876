import { NewRoleCard } from './_components/new-role-card'

export const metadata = { title: 'New Role - Roles' }

/**
 * Create opens in the card slot, in the same place the role it creates will
 * appear — so the list stays visible beside it and the URL is shareable.
 */
export default function NewRolePage() {
  return <NewRoleCard />
}
