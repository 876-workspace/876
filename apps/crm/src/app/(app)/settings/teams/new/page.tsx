import { redirect } from 'next/navigation'

export const metadata = { title: 'Add Team - Settings' }

export default function NewTeamPage() {
  redirect('/settings/teams?team=new')
}
