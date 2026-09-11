import { AddTeamMemberCard } from './_components/add-team-member-card'

export const metadata = { title: 'Add user - Team' }

/**
 * Create owns the whole content area — the toolbar and list stand down while
 * the form is open, and the sidebar stays on Team.
 */
export default function AddTeamMemberPage() {
  return <AddTeamMemberCard />
}
