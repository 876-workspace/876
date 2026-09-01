'use client'

import type {
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

function connectionPath(connectionId: string, action?: string) {
  const root = `/api/accounting-providers/connections/${encodeURIComponent(connectionId)}`
  return action ? `${root}/${action}` : root
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

export const accountingProviders = {
  connections: {
    create: createConnection,
    authorize: authorizeConnection,
    validate: validateConnection,
    reconcile: reconcileConnection,
    disable: disableConnection,
  },
}
