import { isWorkIntegrationScope, WORK_CRM_INTEGRATION_SCOPES, type WorkIntegrationScope } from '@876/work'
import * as repository from './connections.repository.js'

export async function activeConnectionAuthorization(tenantId: string, appId: string) {
  const connection = await repository.activeConnection(tenantId, appId)
  return connection ? { scopes: new Set(connection.scopes) } : null
}
export async function ensureConnection(tenantId: string, appId: string, scopes: readonly string[]) {
  const invalid = scopes.filter((scope) => !isWorkIntegrationScope(scope))
  if (invalid.length) throw new Error(`Unknown Work integration scopes: ${invalid.join(', ')}`)
  return repository.ensure(tenantId, appId, scopes as readonly WorkIntegrationScope[])
}
export const ensureCrmConnection = (tenantId: string, appId: string) => ensureConnection(tenantId, appId, WORK_CRM_INTEGRATION_SCOPES)
