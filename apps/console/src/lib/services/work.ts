import 'server-only'

import { create876WorkOperatorClient } from '@876/work/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.WORK_API_URL,
    internalKey: process.env.WORK_INTERNAL_KEY!,
    requestId,
  }
}

export function createWork(requestId?: string) {
  return create876WorkOperatorClient(options(requestId))
}

export const work = createWork()
