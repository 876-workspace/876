import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Badge } from '@876/ui/badge'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'
import { Link2 } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { ChangeImageDialog } from '@/components/patterns/change-image-dialog'
import { RouteTabs } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderTabs,
} from '@876/ui/detail-header'
import { resolveApp } from './_data'
import { getAppTabs } from './_lib/app-detail-tabs'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'App not found' }
  return { title: `${app.name} - Apps` }
}

/**
 * The app detail shell.
 *
 * Awaits `params` only — an await in a layout suspends into the parent segment's
 * boundary, which is the apps list you just clicked from.
 *
 * The tab set is the one thing here that genuinely depends on data: `getAppTabs`
 * keys off `app_kind`, and an internal app has four tabs where a product app has
 * nine. So the strip streams, with the shared minimum as its fallback — real,
 * clickable tabs rather than a skeleton, and no tab that later disappears.
 */
export default async function AppDetailLayout({ children, params }: Props) {
  const { slug } = await params
  const base = `/apps/${slug}`

  return (
    <div>
      <DetailHeader>
        <DetailHeaderTop>
          <DetailHeaderMain className="min-w-0 flex-1">
            <Suspense fallback={<IdentityFallback />}>
              <Identity slug={slug} />
            </Suspense>
          </DetailHeaderMain>
        </DetailHeaderTop>

        <DetailHeaderTabs>
          <Suspense
            fallback={<RouteTabs tabs={getAppTabs('internal', base)} />}
          >
            <AppTabs base={base} slug={slug} />
          </Suspense>
        </DetailHeaderTabs>
      </DetailHeader>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

/** Decides the route exists, so `notFound()` belongs here rather than in the shell. */
async function Identity({ slug }: { slug: string }) {
  const app = await resolveApp(slug)
  if (!app) notFound()

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center gap-3">
        <ChangeImageDialog
          entity="app"
          routeKey="app.logo"
          ownerId={app.id}
          currentImageUrl={app.logo_url}
          fallbackName={app.name}
          imageKind="logo"
        >
          <AppLogo name={app.name} src={app.logo_url} size="md" />
        </ChangeImageDialog>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="876-page-title text-foreground truncate">
              {app.name}
            </h1>
            <Badge
              variant={app.status === 'active' ? 'success' : 'secondary'}
              className="capitalize"
            >
              {app.status}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span className="flex items-center">
          <span className="text-muted-foreground/70 mr-1 font-medium">#</span>
          {app.slug}
        </span>
        {app.homepage_url && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <a
              href={app.homepage_url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground group flex items-center gap-1 hover:underline"
            >
              <Link2 className="text-muted-foreground/70 group-hover:text-foreground size-3.5 transition-colors" />
              {app.homepage_url.replace(/^https?:\/\//, '')}
            </a>
          </>
        )}
      </div>
    </div>
  )
}

/** Sized to the resolved identity band so nothing shifts on hand-off. */
function IdentityFallback() {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
  )
}

async function AppTabs({ base, slug }: { base: string; slug: string }) {
  const app = await resolveApp(slug)
  return <RouteTabs tabs={getAppTabs(app?.app_kind ?? 'internal', base)} />
}
