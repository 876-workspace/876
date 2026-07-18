import { notFound } from 'next/navigation'

import { WidgetAccessList } from '@/components/widgets/widget-access-list'
import { getConsoleWidgetByRouteSlug } from '@/components/widgets/widget-catalog'

export default async function WidgetAccessPage({
  params,
}: {
  params: Promise<{ widgetSlug: string }>
}) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetAccessList widget={widget} />
}
