import { AddTeamMemberCard } from './_components/add-team-member-card'

export const metadata = { title: 'Add user - Team' }

/**
 * Create opens in the card slot, in the same place the member it creates will
 * appear — so the list stays visible beside it and the URL is shareable.
 */
export default function AddTeamMemberPage() {
  return <AddTeamMemberCard />
}
