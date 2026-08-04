'use client'

import { useParams } from 'next/navigation'
import { Page } from '@876/ui/page'

import { ProfileSettingsShell } from './_components/profile-settings-shell'
import { ProfileSkeleton } from './_components/profile-skeleton'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <ProfileSettingsShell orgSlug={orgSlug} />
      <ProfileSkeleton />
    </Page>
  )
}
