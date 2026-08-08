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

import { getConsoleWidgetStatusFeatureSlug } from '../widget-catalog'
import { WidgetCatalogIcon } from './widget-catalog-icon'
import { FeatureToggle } from '@/components/patterns/feature-toggle'

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
    <DetailHeader
      condensedTitle={
        <>
          <WidgetCatalogIcon
            visual={widget.visual}
            className="size-6 rounded-md"
            iconClassName="size-3.5"
          />
          <span className="truncate text-[0.8125rem] font-semibold">{widget.name}</span>
        </>
      }
    >
      <DetailHeaderTop>
        <DetailHeaderMain>
          <WidgetCatalogIcon
            visual={widget.visual}
            className="size-12 rounded-xl"
            iconClassName="size-6"
          />
          <div className="min-w-0">
            <h1 className="876-page-title">{widget.name}</h1>
            {/* Capped to a readable measure — unbounded, the description ran
                the full column width and read as a wall of grey. */}
            <p className="text-muted-foreground mt-1 line-clamp-2 max-w-3xl text-[0.8125rem]">
              {widget.description}
            </p>
          </div>
        </DetailHeaderMain>
        <DetailHeaderActions>
          <div className="border-876-surface-border bg-876-surface flex items-center gap-3 rounded-lg border px-3 py-2">
            <span className="text-muted-foreground text-[0.8125rem] font-medium">
              Enabled
            </span>
            {feature ? (
              <FeatureToggle feature={feature} />
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
