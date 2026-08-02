import { notFound } from 'next/navigation'

import { getConsoleWidgetByRouteSlug } from '@/features/widgets/widget-catalog'
import { WidgetOverview } from '@/features/widgets/components/widget-overview'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ widgetSlug: string }>
}) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetOverview widget={widget} />
}
