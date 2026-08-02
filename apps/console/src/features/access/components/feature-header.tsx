'use client'

import type { AdminApp, AdminFeature } from '@876/admin'
import { cn } from '@876/core/utils'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { FeatureToolbar } from './feature-actions'
import { Flag, InfoIcon } from '@876/ui/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@876/ui/tooltip'

type FeatureHeaderProps = {
  feature: AdminFeature
  apps: AdminApp[]
  tabs: DetailTab[]
  appSlug?: string
  returnHref?: string
  isNested?: boolean
}

export function FeatureHeader({
  feature,
  apps,
  tabs,
  appSlug,
  returnHref,
  isNested = false,
}: FeatureHeaderProps) {
  return (
    <div
      className={cn(
        'relative',
        !isNested &&
          'bg-876-canvas/95 supports-[backdrop-filter]:bg-876-canvas/75 backdrop-blur-md sm:sticky sm:top-0 sm:z-20'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8',
          !isNested &&
            'border-border border-b shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.02)]'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-8 overflow-x-auto">
          {/* Identity Block */}
          <div className="flex shrink-0 items-center">
            <div className="flex items-center gap-3">
              <Flag
                className={cn(
                  'size-5',
                  feature.enabled
                    ? 'text-green-500 drop-shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500'
                )}
                strokeWidth={2.5}
              />
              <div className="flex flex-col justify-center">
                <h1 className="876-page-title text-foreground flex items-center gap-2">
                  {feature.name}
                  {feature.description && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-muted-foreground hover:text-foreground cursor-help transition-colors">
                          <InfoIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-xs leading-relaxed"
                        >
                          {feature.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </h1>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[11px] font-medium">
                  <span className="text-foreground/80 font-mono">
                    {feature.slug}
                  </span>
                  <span className="bg-border/80 size-1 rounded-full" />
                  <span className="tracking-wide capitalize">
                    {feature.scope}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="shrink-0">
            <RouteTabs tabs={tabs} variant="pill" />
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center pl-2">
          <FeatureToolbar
            feature={feature}
            apps={apps}
            appSlug={appSlug}
            returnHref={returnHref}
          />
        </div>
      </div>
    </div>
  )
}
