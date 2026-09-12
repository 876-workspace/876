import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getConsoleWidgetByRouteSlug } from '@/features/widgets/widget-catalog'
import { WidgetOverview } from '@/features/widgets/components/widget-overview'

type Props = { params: Promise<{ widgetSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  return { title: widget?.name ?? 'Widget' }
}

export default async function WidgetPage({ params }: Props) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetOverview widget={widget} />
}
