import 'server-only'

import { createWidgetsClient } from '@876/widgets/server'

export const $widgets = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})
