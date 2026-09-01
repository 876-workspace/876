import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { platform } from '@/lib/services/platform'
import { resolveApp } from '../_data'
import { AppProvisioningShell } from './_components/app-provisioning-shell'
import { ProfilesList } from './_components/profiles-list'
import { PROFILES_SKELETON_COLUMNS } from './_components/profiles-skeleton-columns'

export default async function AppProvisioningLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  return (
    <AppProvisioningShell
      slug={slug}
      appId={app.id}
      list={
        <Suspense
          fallback={<DataTableSkeleton columns={PROFILES_SKELETON_COLUMNS} />}
        >
          <AppProfilesListData appId={app.id} slug={slug} />
        </Suspense>
      }
    >
      {children}
    </AppProvisioningShell>
  )
}

async function AppProfilesListData({
  appId,
  slug,
}: {
  appId: string
  slug: string
}) {
  const result = await platform.provisioning.applicationProfiles.list(appId)
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ??
        'Failed to load application provisioning profiles.'
    )

  return (
    <ProfilesList
      profiles={result.data.data as ApplicationProvisioningProfile[]}
      slug={slug}
    />
  )
}
