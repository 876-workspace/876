import { notFound } from 'next/navigation'

import { getConsoleWidgetByRouteSlug } from '@/components/widgets/widget-catalog'
import { WidgetOverview } from '@/components/widgets/widget-overview'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ widgetSlug: string }>
}) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetOverview widget={widget} />
}
