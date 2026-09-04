import 'server-only'

import { create876CrmOperatorClient } from '@876/crm/operator'
import { create876CrmWorkspaceClient } from '@876/crm'

function options(requestId?: string) {
  return {
    baseUrl: process.env.CRM_API_URL,
    internalKey: process.env.CRM_INTERNAL_KEY!,
    requestId,
  }
}

export function createCrm(requestId?: string) {
  const op = create876CrmOperatorClient(options(requestId))
  const ws = create876CrmWorkspaceClient(options(requestId))
  return {
    ...op,
    workspaces: ws,
    ensure: ws.ensure.bind(ws),
  } as typeof op & { workspaces: typeof ws; ensure: typeof ws.ensure }
}

export const crm = createCrm()

export function listRequestsAcrossOrganizations(
  requestId?: string,
  options?: Parameters<typeof crm.requests.listAcrossOrganizations>[0]
) {
  return createCrm(requestId).requests.listAcrossOrganizations(options)
}
