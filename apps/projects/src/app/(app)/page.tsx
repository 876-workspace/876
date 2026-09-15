import type { Metadata } from 'next'
import { Suspense } from 'react'

import { requireAppPermission } from '@/lib/auth/require-projects-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { HomeData, HomeSkeleton } from './_components/home-data'
import { HomeHeader } from './_components/home-header'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Projects, issues, and the work this organization is tracking.',
}

export default async function HomePage() {
  await requireAppPermission('dashboard.view')
  const { orgName } = await requireProjectsContext()
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const session = await getAuthSession()
  const sessionUser = isSignedSession(session) ? session.user : null
  const displayName = sessionUser
    ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(' ') ||
      sessionUser.email
    : 'User'
  const nowSeconds = Math.floor(new Date().getTime() / 1000)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <HomeHeader
        user={{
          name: displayName,
          email: sessionUser?.email ?? '',
          avatar: sessionUser?.avatar ?? null,
        }}
        today={today}
        orgName={orgName}
      />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeData nowSeconds={nowSeconds} />
      </Suspense>
    </div>
  )
}
