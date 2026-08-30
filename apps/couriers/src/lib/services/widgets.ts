import 'server-only'

import { create876WidgetsServiceClient } from '@876/widgets/service'

/** First-party Widgets access for Couriers-hosted notes and collections. */
export function createWidgetsService(requestId?: string) {
  return create876WidgetsServiceClient({
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    requestId,
  })
}

export const widgets = createWidgetsService()
