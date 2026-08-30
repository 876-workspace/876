import { create876WorkOperatorClient } from '@876/work/operator'

export function workClient() {
  return create876WorkOperatorClient({
    baseUrl: process.env.WORK_API_URL,
    internalKey: process.env.WORK_INTERNAL_KEY,
  })
}

export function crmRequestWorkContext(requestId: string) {
  return { service: 'crm', resource: 'request', id: requestId } as const
}
