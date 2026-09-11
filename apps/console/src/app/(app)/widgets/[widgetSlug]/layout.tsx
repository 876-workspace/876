import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { RouteTabItem } from '@876/ui/route-tabs'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'

import {
  getConsoleWidgetByRouteSlug,
  getConsoleWidgetDetailHref,
} from '@/features/widgets/widget-catalog'
import { WidgetCatalogIcon } from '@/features/widgets/components/widget-catalog-icon'

export default async function WidgetLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ widgetSlug: string }>
}) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  const base = getConsoleWidgetDetailHref(widget)
  const tabs: RouteTabItem[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Access', href: `${base}/access` },
  ]

  return (
    <DetailCard aria-label={`Widget details: ${widget.name}`}>
      <DetailCardHeader
        icon={
          <WidgetCatalogIcon
            visual={widget.visual}
            className="size-12 rounded-xl"
            iconClassName="size-6"
          />
        }
        title={widget.name}
        subtitle={widget.description}
        closeHref="/widgets"
        closeLabel="Close widget details"
      />
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}
