import type { WidgetMetadata } from '@876/widgets'

import { RouteTabs } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderActions,
  DetailHeaderMain,
  DetailHeaderTabs,
  DetailHeaderTop,
} from '@876/ui/detail-header'

import { $876 } from '@/lib/876'

import { getConsoleWidgetStatusFeatureSlug } from './widget-catalog'
import { WidgetCatalogIcon } from './widget-catalog-icon'
import { WidgetFeatureToggle } from './widget-feature-toggle'

export async function WidgetDetailHeader({
  widget,
  tabs,
}: {
  widget: WidgetMetadata
  tabs: { label: string; href: string; exact?: boolean }[]
}) {
  const featureSlug = getConsoleWidgetStatusFeatureSlug(widget)
  const featuresResult = await $876.features.list({
    limit: 100,
    includeTag: 'widget',
  })
  const feature = featureSlug
    ? (featuresResult.data?.data.find((item) => item.slug === featureSlug) ??
      null)
    : null

  return (
    <DetailHeader>
      <DetailHeaderTop className="px-4 pt-5 sm:px-6 lg:px-8">
        <DetailHeaderMain>
          <WidgetCatalogIcon
            visual={widget.visual}
            className="mt-0.5 size-12 rounded-xl"
            iconClassName="size-6"
          />
          <div className="min-w-0">
            <h1 className="876-page-title">{widget.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {widget.description}
            </p>
          </div>
        </DetailHeaderMain>
        <DetailHeaderActions>
          <div className="border-876-surface-border bg-876-surface flex items-center gap-3 rounded-md border px-3 py-2">
            <span className="text-sm font-medium">Enabled</span>
            {feature ? (
              <WidgetFeatureToggle feature={feature} />
            ) : (
              <span className="text-muted-foreground font-mono text-xs">
                Missing: {featureSlug}
              </span>
            )}
          </div>
        </DetailHeaderActions>
      </DetailHeaderTop>
      <DetailHeaderTabs>
        <RouteTabs tabs={tabs} />
      </DetailHeaderTabs>
    </DetailHeader>
  )
}
