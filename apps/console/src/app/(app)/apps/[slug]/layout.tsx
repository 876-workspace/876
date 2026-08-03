import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Badge } from '@876/ui/badge'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'
import { Link2 } from '@876/ui/icons'

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

export default async function AppDetailLayout({ children, params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const base = `/apps/${slug}`
  const tabs = getAppTabs(app.app_kind, base)

  return (
    <div>
      <DetailHeader>
        <DetailHeaderTop>
          <DetailHeaderMain className="min-w-0 flex-1">
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
                      variant={
                        app.status === 'active' ? 'success' : 'secondary'
                      }
                      className="capitalize"
                    >
                      {app.status}
                    </Badge>
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
        </DetailHeaderTop>

        <DetailHeaderTabs>
          <RouteTabs tabs={tabs} />
        </DetailHeaderTabs>
      </DetailHeader>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
