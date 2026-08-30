import { redirect } from 'next/navigation'

export const metadata = { title: 'Users - Settings' }

/** The persistent Team layout renders the toolbar and member list. */
export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; status?: string }>
}) {
  const { member, status } = await searchParams
  if (member) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    redirect(`/settings/users/${encodeURIComponent(member)}${query}`)
  }

  return null
}
