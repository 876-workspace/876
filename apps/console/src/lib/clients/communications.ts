import 'server-only'

import { create876CommunicationsOperatorClient } from '@876/communications/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.COMMUNICATIONS_API_URL,
    internalKey: process.env.COMMUNICATIONS_INTERNAL_KEY!,
    requestId,
  }
}

export function createCommunications(requestId?: string) {
  return create876CommunicationsOperatorClient(options(requestId))
}

export const communications = createCommunications()
