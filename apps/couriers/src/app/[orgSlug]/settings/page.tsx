import { redirect } from 'next/navigation'

/** The settings hub is the organization profile — the sidebar owns section navigation. */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/settings/orgprofile`)
}
