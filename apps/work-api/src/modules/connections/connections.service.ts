import { WORK_INTEGRATION_SCOPES } from '@876/work'

import * as repository from './connections.repository.js'

function sameScopes(actual: readonly string[], expected: readonly string[]) {
  return (
    actual.length === expected.length &&
    actual.every((scope) => expected.includes(scope))
  )
}

export async function activeConnectionAuthorization(
  tenantId: string,
  appId: string
) {
  const connection = await repository.activeConnection(tenantId, appId)
  return connection ? { scopes: new Set(connection.scopes) } : null
}

export async function ensureCrmConnection(tenantId: string, appId: string) {
  const connection = await repository.ensure(
    tenantId,
    appId,
    WORK_INTEGRATION_SCOPES
  )
  if (!sameScopes(connection.scopes, WORK_INTEGRATION_SCOPES)) {
    console.warn('work.connection.scopes_mismatch', {
      tenant_id: tenantId,
      app_id: appId,
      expected_scopes: WORK_INTEGRATION_SCOPES,
      stored_scopes: connection.scopes,
    })
  }
  return connection
}
