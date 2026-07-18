import 'server-only'

import { createWidgetsClient } from '@876/widgets/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'

/** Server-only client for the Widgets API (no DB credentials in Console). */
export const $widgets = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})

export const $widgetsAdmin = createWidgetsAdminClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})
