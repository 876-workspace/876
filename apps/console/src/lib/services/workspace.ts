import 'server-only'

import { create876WorkspaceOperatorClient } from '@876/workspace/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.API_URL,
    internalKey: process.env.API_INTERNAL_KEY!,
    apiKey: process.env.API_876_KEY,
    requestId,
  }
}

export function createWorkspace(requestId?: string) {
  return create876WorkspaceOperatorClient(options(requestId))
}

export const workspace = createWorkspace()
