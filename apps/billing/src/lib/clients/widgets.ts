import 'server-only'

import {
  create876WidgetsServiceClient,
  type WidgetsServiceClient,
} from '@876/widgets/service'

let widgetsClient: WidgetsServiceClient | undefined

/**
 * Widgets service credential is static for Billing, so it is a lazy module
 * singleton. Each call still supplies its signed-in member actor.
 */
export function getWidgets() {
  if (widgetsClient) return widgetsClient

  widgetsClient = create876WidgetsServiceClient({
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
  })

  return widgetsClient
}
