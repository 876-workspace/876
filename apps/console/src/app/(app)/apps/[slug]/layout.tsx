import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cn } from '@876/core/utils'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'
import { Link2 } from '@876/ui/icons'

import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
} from '@876/ui/detail-header'
import { resolveApp } from './_data'
import { AppActions } from './app-actions'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

function getStatusDotColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500'
    case 'suspended':
      return 'bg-amber-500'
    case 'inactive':
      return 'bg-slate-400'
    case 'banned':
      return 'bg-red-500'
    default:
      return 'bg-muted-foreground'
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'App not found' }
  return { title: `${app.name} - Apps` }
}

export default async function AppDetailLayout({ children, params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const base = `/apps/${slug}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    ...(app.app_kind === 'product'
      ? [
          { label: 'Plans', href: `${base}/plans` },
          { label: 'Modules', href: `${base}/modules` },
          { label: 'Subscribers', href: `${base}/subscribers` },
        ]
      : []),
    { label: 'Feature Flags', href: `${base}/features` },
    { label: 'Widgets', href: `${base}/widgets` },
    { label: 'API Keys', href: `${base}/api-keys` },
    { label: 'Provisioning', href: `${base}/provisioning` },
    { label: 'Settings', href: `${base}/settings` },
  ]

  return (
    <div>
      <DetailHeader>
        <DetailHeaderTop>
          <DetailHeaderMain className="min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="876-eyebrow mb-1">{app.app_kind}</div>
              <div className="mb-1.5 flex items-center gap-3">
                <AppLogo name={app.name} src={app.logo_url} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h1 className="876-page-title text-foreground truncate">
                      {app.name}
                    </h1>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          getStatusDotColor(app.status)
                        )}
                      />
                      <span className="capitalize">{app.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="flex items-center">
                  <span className="text-muted-foreground/70 mr-1 font-medium">
                    #
                  </span>
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
          </DetailHeaderMain>

          <DetailHeaderActions>
            <AppActions app={app} />
          </DetailHeaderActions>
        </DetailHeaderTop>

        <DetailHeaderTabs>
          <RouteTabs tabs={tabs} />
        </DetailHeaderTabs>
      </DetailHeader>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
