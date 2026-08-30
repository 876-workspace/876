import 'server-only'

import { create876WidgetsOperatorClient } from '@876/widgets/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    requestId,
  }
}

export function createWidgets(requestId?: string) {
  return create876WidgetsOperatorClient(options(requestId))
}

export const widgets = createWidgets()
