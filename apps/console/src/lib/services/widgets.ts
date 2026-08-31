import 'server-only'

import { create876WidgetsOperatorClient } from '@876/widgets/operator'
import { create876WidgetsServiceClient } from '@876/widgets/service'

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

/** Widgets service transport, which owns note collections. */
export function createWidgetsService(requestId?: string) {
  // Service client takes no requestId — accept for signature symmetry but do not forward
  void requestId
  return create876WidgetsServiceClient({
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
  })
}

export const widgetsService = createWidgetsService()
