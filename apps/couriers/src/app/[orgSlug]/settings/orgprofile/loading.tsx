'use client'

import { Page } from '@876/ui/page'

import { ProfileSettingsShell } from './_components/profile-settings-shell'
import { ProfileSkeleton } from './_components/profile-skeleton'

export default function Loading() {
  return (
    <Page>
      <ProfileSettingsShell />
      <ProfileSkeleton />
    </Page>
  )
}
