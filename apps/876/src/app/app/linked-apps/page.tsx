import type { Metadata } from 'next'

import { $876 } from '@/lib/876'
import { requireConsumerFeature } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { LinkedAppCard } from './_components/linked-app-card'
import { LinkedAppsEmptyState } from './_components/linked-apps-empty-state'
import { LinkedAppsHeader } from './_components/linked-apps-header'
import type { LinkedAppGrant } from './_lib/linked-apps-types'

export const metadata: Metadata = {
  title: 'Linked Apps | 876',
  robots: { index: false, follow: false },
}

export default async function LinkedAppsPage() {
  await requireConsumerFeature('apps')

  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <LinkedAppsHeader />
        <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
          <LinkedAppsEmptyState
            title="Linked apps are unavailable"
            description="Authentication required"
          />
        </section>
      </div>
    )
  }

  const grantsResult = await $876.oauthGrants.list(session.user.id)
  const grants: LinkedAppGrant[] = grantsResult.error
    ? []
    : (grantsResult.data ?? [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <LinkedAppsHeader />

      <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
        {grants.length ? (
          <div className="grid gap-4">
            {grants.map((app) => (
              <LinkedAppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <LinkedAppsEmptyState
            title="No linked apps yet"
            description="Apps you authorize through Sign in with 876 will appear here."
          />
        )}
      </section>
    </div>
  )
}
