import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WidgetAccessList } from '@/features/access/components/widget-access-list'
import { getConsoleWidgetByRouteSlug } from '@/features/widgets/widget-catalog'

type Props = { params: Promise<{ widgetSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  return { title: widget ? `${widget.name} Access` : 'Widget Access' }
}

export default async function WidgetAccessPage({ params }: Props) {
  const widget = getConsoleWidgetByRouteSlug((await params).widgetSlug)
  if (!widget) notFound()
  return <WidgetAccessList widget={widget} />
}
