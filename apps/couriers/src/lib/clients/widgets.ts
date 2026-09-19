import 'server-only'

import { create876WidgetsServiceClient } from '@876/widgets/service'

/**
 * First-party Widgets access for Couriers-hosted notes and collections. The
 * Widgets transport takes no request id, so this root does not thread one.
 */
export function createWidgetsService() {
  return create876WidgetsServiceClient({
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
  })
}

export const widgets = createWidgetsService()
