import type { ReactNode } from 'react'

import { Badge } from '@876/ui/badge'
import { cn } from '@876/core/utils'

import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
} from '@876/ui/detail-header'

export function DetailLayout({
  children,
  eyebrow,
  title,
  description,
  status,
  statusVariant = 'secondary',
  tabs,
  avatar,
  meta,
  actions,
  titleClassName,
}: {
  children: ReactNode
  backHref: string
  backLabel: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  status: string
  statusVariant?: 'secondary' | 'success' | 'info' | 'warning' | 'destructive'
  tabs: DetailTab[]
  /** Optional leading avatar/logo, rendered to the left of the title. */
  avatar?: ReactNode
  /** Optional icon-led metadata row, shown in place of the eyebrow line. */
  meta?: ReactNode
  /** Optional right-aligned actions (detail toolbar). */
  actions?: ReactNode
  titleClassName?: string
}) {
  // Rich mode: an avatar or a metadata row upgrades the header to the
  // spacious, logo-led layout. Otherwise fall back to the compact header.
  const rich = Boolean(avatar || meta)

  return (
    <div>
      <DetailHeader>
        {rich ? (
          <DetailHeaderTop>
            <DetailHeaderMain>
              {avatar}

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1
                    className={cn(
                      'min-w-0 truncate text-xl font-semibold tracking-tight',
                      titleClassName
                    )}
                  >
                    {title}
                  </h1>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground/40 text-sm"
                  >
                    ·
                  </span>
                  <Badge variant={statusVariant}>{status}</Badge>
                </div>

                {meta ? (
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4 sm:text-sm">
                    {meta}
                  </div>
                ) : null}
              </div>
            </DetailHeaderMain>

            {actions ? (
              <DetailHeaderActions>{actions}</DetailHeaderActions>
            ) : null}
          </DetailHeaderTop>
        ) : (
          <div className="px-4 pt-3 pb-2 sm:px-6 sm:pt-4 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <h1 className={cn('876-page-title truncate', titleClassName)}>
                  {title}
                </h1>
                <Badge variant={statusVariant}>{status}</Badge>
              </div>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            {eyebrow || description ? (
              <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                {eyebrow ? (
                  <span className="876-eyebrow shrink-0">{eyebrow}</span>
                ) : null}
                {description ? (
                  <span className="text-muted-foreground truncate text-[0.8125rem]">
                    {description}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <DetailHeaderTabs>
          <RouteTabs tabs={tabs} />
        </DetailHeaderTabs>
      </DetailHeader>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
