'use client'

import type {
  AccountingImportResourceType,
  AccountingProviderAdoption,
  AccountingProviderAdoptionDeleted,
  AccountingProviderAuthorization,
  AccountingProviderConnection,
  AccountingProviderReconcile,
} from '@876/billing/operator'

import { request } from './request'

type CreateConnectionInput = {
  providerId: string
  name: string
  environment?: 'sandbox' | 'live'
  mode?: 'native' | 'mirror' | 'provider-backed'
}

type AdoptionInput = {
  connectionId: string
  resourceType: AccountingImportResourceType
  resourceId: string
  externalId: string
}

type ReleaseInput = Omit<AdoptionInput, 'externalId'>

function connectionPath(connectionId: string, action?: string) {
  const root = `/api/accounting-providers/connections/${encodeURIComponent(connectionId)}`
  return action ? `${root}/${action}` : root
}

function adoptionPath(
  connectionId: string,
  resourceType: AccountingImportResourceType,
  resourceId?: string
) {
  const root = `${connectionPath(connectionId)}/imports/${resourceType}/adoptions`
  return resourceId ? `${root}/${encodeURIComponent(resourceId)}` : root
}

const createConnection = (params: CreateConnectionInput) =>
  request<AccountingProviderConnection>('/api/accounting-providers/connections', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const authorizeConnection = (connectionId: string) =>
  request<AccountingProviderAuthorization>(
    connectionPath(connectionId, 'authorize'),
    { method: 'POST' }
  )

const validateConnection = (connectionId: string) =>
  request<AccountingProviderConnection>(connectionPath(connectionId, 'validate'), {
    method: 'POST',
  })

const reconcileConnection = (connectionId: string) =>
  request<AccountingProviderReconcile>(
    connectionPath(connectionId, 'reconcile'),
    { method: 'POST' }
  )

const disableConnection = (connectionId: string) =>
  request<{ object: 'accounting-provider-connection'; id: string; deleted: true }>(
    connectionPath(connectionId),
    { method: 'DELETE' }
  )

const adopt = (params: AdoptionInput) =>
  request<AccountingProviderAdoption>(
    adoptionPath(params.connectionId, params.resourceType),
    {
      method: 'POST',
      body: JSON.stringify({
        resourceId: params.resourceId,
        externalId: params.externalId,
      }),
    }
  )

const release = (params: ReleaseInput) =>
  request<AccountingProviderAdoptionDeleted>(
    adoptionPath(params.connectionId, params.resourceType, params.resourceId),
    { method: 'DELETE' }
  )

export const accountingProviders = {
  connections: {
    create: createConnection,
    authorize: authorizeConnection,
    validate: validateConnection,
    reconcile: reconcileConnection,
    disable: disableConnection,
    imports: { adopt, release },
  },
}
