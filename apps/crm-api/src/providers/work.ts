import { create876WorkIntegrationClient } from '@876/work/integration'

export function workClient() {
  return create876WorkIntegrationClient({
    baseUrl: process.env.WORK_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
  })
}

export function crmRequestWorkContext(requestId: string) {
  return { service: 'crm', resource: 'request', id: requestId } as const
}
