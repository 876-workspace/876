import type { Metadata } from 'next'

import { requireConsumerFeature } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { DeveloperAppsClient } from './developer-apps-client'

export const metadata: Metadata = {
  title: 'Developer Apps | 876',
  robots: { index: false, follow: false },
}

export default async function DeveloperAppsPage() {
  await requireConsumerFeature('apps')

  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <Header />
        <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-6 shadow-[0_22px_70px_rgb(15_23_42_/_7%)]">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">
            Developer apps are unavailable
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Authentication required
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <Header />
      <DeveloperAppsClient apps={[]} />
    </div>
  )
}

function Header() {
  return (
    <div>
      <p className="text-muted-foreground text-sm font-medium">Developers</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#202124] dark:text-white">
        Developer apps
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
        Register third-party applications that use 876 as an OpenID Connect
        sign-in provider.
      </p>
    </div>
  )
}
