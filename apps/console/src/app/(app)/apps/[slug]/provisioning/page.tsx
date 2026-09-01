import { buttonVariants } from '@876/ui/button'
import { Skeleton } from '@876/ui/skeleton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { platform } from '@/lib/services/platform'
import { resolveApp } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export default function AppProvisioningPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <AppProvisioningProfiles params={params} />
    </Suspense>
  )
}

async function AppProvisioningProfiles({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const result = await platform.provisioning.applicationProfiles.list(app.id)
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Failed to load application provisioning profiles.'
    )

  const profiles = result.data.data

  return (
    <div className="space-y-5">
      <section className="876-card flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="max-w-2xl">
          <h2 className="text-foreground text-sm font-semibold">
            Provisioning profiles
          </h2>
          <p className="text-muted-foreground mt-1 text-[0.8125rem]">
            Each organization using {app.name} is routed once to one active
            profile. Conditional profiles win by specificity and priority; the
            default is used only when no condition matches. Existing assignments
            never change when routing policy changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/settings/orgs/provisioning/runs?app_id=${encodeURIComponent(app.id)}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            View runs
          </Link>
          <Link
            href={`/apps/${encodeURIComponent(app.slug)}/provisioning/new`}
            className={buttonVariants({ variant: 'info' })}
          >
            New profile
          </Link>
        </div>
      </section>

      <section className="876-card overflow-hidden">
        <div className="divide-y">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/apps/${encodeURIComponent(app.slug)}/provisioning/${encodeURIComponent(profile.key)}`}
              className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{profile.name}</span>
                  {profile.is_default ? (
                    <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                      Default
                    </span>
                  ) : null}
                  <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    {profile.status}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {profile.key} · {profile.conditions.length} routing{' '}
                  {profile.conditions.length === 1 ? 'condition' : 'conditions'} ·{' '}
                  {profile.selection_count} selected organizations
                </p>
                {profile.description ? (
                  <p className="text-muted-foreground mt-1 max-w-2xl text-xs">
                    {profile.description}
                  </p>
                ) : null}
              </div>

              <div className="text-right text-xs">
                <p className="text-foreground font-medium">
                  {profile.published_revision === null
                    ? 'Not published'
                    : `Published r${profile.published_revision}`}
                </p>
                <p className="text-muted-foreground mt-1">
                  {profile.has_draft ? 'Draft changes pending' : 'No draft'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
