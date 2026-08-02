import { notFound } from 'next/navigation'

import { WidgetAccessList } from '@/features/access/components/widget-access-list'
import { getConsoleWidgetByRouteSlug } from '@/features/widgets/widget-catalog'

export default async function WidgetAccessPage({
  params,
}: {
  params: Promise<{ widgetSlug: string }>
}) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetAccessList widget={widget} />
}
