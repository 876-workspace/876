import { notFound } from 'next/navigation'

import { platform } from '@/lib/services/platform'
import { resolveApp } from '../../_data'
import { NewProfileCard } from './_components/new-profile-card'

export const metadata = { title: 'New Provisioning Profile' }

type Props = { params: Promise<{ slug: string }> }

export default async function NewApplicationProvisioningProfilePage({
  params,
}: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const result = await platform.provisioning.applicationProfiles.list(app.id)
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Failed to load application provisioning profiles.'
    )

  return (
    <NewProfileCard
      appId={app.id}
      appSlug={app.slug}
      appName={app.name}
      profiles={result.data.data}
    />
  )
}
