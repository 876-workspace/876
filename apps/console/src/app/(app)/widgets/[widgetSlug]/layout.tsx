import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import {
  getConsoleWidgetByRouteSlug,
  getConsoleWidgetDetailHref,
} from '@/components/widgets/widget-catalog'
import { WidgetDetailHeader } from '@/components/widgets/widget-detail-header'

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

  return (
    <div>
      <WidgetDetailHeader
        widget={widget}
        tabs={[
          { label: 'Overview', href: base, exact: true },
          { label: 'Access', href: `${base}/access` },
        ]}
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
