import type { Metadata } from 'next'

import Image from 'next/image'
import Link from 'next/link'
import { AppWindow, ExternalLink, ShieldCheck } from '@876/ui/icons'

import { $876 } from '@/lib/876'
import { requireConsumerFeature } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

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
        <HeadingSection />
        <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
          <EmptyState
            title="Linked apps are unavailable"
            description="Authentication required"
          />
        </section>
      </div>
    )
  }

  const grantsResult = await $876.oauthGrants.list(session.user.id)
  const grants = grantsResult.error ? [] : (grantsResult.data ?? [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <HeadingSection />

      <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
        {grants.length ? (
          <div className="grid gap-4">
            {grants.map(
              (app: {
                id: string
                name: string
                logoUrl: string | null
                homepageUrl: string | null
                scopes: string[]
              }) => (
                <article
                  key={app.id}
                  className="border-border/70 flex flex-col gap-4 rounded-[1.25rem] border bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--876-blue)_12%,transparent)] text-[color:var(--876-blue)]">
                      {app.logoUrl ? (
                        <Image
                          src={app.logoUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="size-9 rounded-xl object-cover"
                        />
                      ) : (
                        <AppWindow aria-hidden="true" className="size-6" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-[-0.02em]">
                        {app.name}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Scopes: {app.scopes.join(', ')}
                      </p>
                      {app.homepageUrl ? (
                        <Link
                          href={app.homepageUrl}
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--876-blue)]"
                        >
                          Visit app
                          <ExternalLink
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <form action="/api/linked-apps/revoke" method="post">
                    <input type="hidden" name="grant_id" value={app.id} />
                    <button className="border-input bg-background hover:bg-accent focus-visible:ring-ring/50 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-hidden">
                      Revoke access
                    </button>
                  </form>
                </article>
              )
            )}
          </div>
        ) : (
          <EmptyState
            title="No linked apps yet"
            description="Apps you authorize through Sign in with 876 will appear here."
          />
        )}
      </section>
    </div>
  )
}

function HeadingSection() {
  return (
    <div>
      <p className="text-muted-foreground text-sm font-medium">
        Account access
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#202124] dark:text-white">
        Linked apps
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
        Manage third-party apps you have allowed to sign you in with your 876
        consumer account.
      </p>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.25rem] border border-dashed p-8 text-center">
      <ShieldCheck
        aria-hidden="true"
        className="size-9 text-[color:var(--876-green)]"
      />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
    </div>
  )
}
