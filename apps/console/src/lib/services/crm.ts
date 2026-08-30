import 'server-only'

import { create876CrmOperatorClient } from '@876/crm/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.CRM_API_URL,
    internalKey: process.env.CRM_INTERNAL_KEY!,
    requestId,
  }
}

export function createCrm(requestId?: string) {
  return create876CrmOperatorClient(options(requestId))
}

export const crm = createCrm()
