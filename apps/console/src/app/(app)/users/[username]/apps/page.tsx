import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RectangleGroup } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { Panel } from '../_components/account/panel'
import { AppEnrollments } from '../_components/account/identity'
import { resolveUser, resolveUserApps } from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Apps' }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Apps - Users` }
}

/**
 * The 876 products this person has actually signed into.
 *
 * One 876 account unlocks every surface, so this is the answer to "where has
 * this login been used" — enrollment is recorded on first session per app.
 */
export default async function UserAppsPage({ params }: Props) {
  const { username } = await params

  return (
    <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
      <AppsData username={username} />
    </Suspense>
  )
}

async function AppsData({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) notFound()

  const apps = await resolveUserApps(user.id)

  return (
    <Panel title="Apps" icon={RectangleGroup} tone="sky" count={apps.length}>
      <AppEnrollments apps={apps} />
    </Panel>
  )
}
