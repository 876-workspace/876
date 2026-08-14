import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createProviderConnectionRow,
  findActiveProviderRow,
  listProviderConnectionRows,
  listProviderRows,
  updateProviderConnectionRow,
} from './payment-providers.repository'
import type {
  ProviderConnectionCreateBody,
  ProviderConnectionUpdateBody,
} from './payment-providers.schemas'
import {
  serializePaymentProvider,
  serializeProviderConnection,
} from './payment-providers.serializers'

function list<T>(data: T[], url: string) {
  return {
    object: 'list' as const,
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

export async function listPaymentProviders() {
  return list(
    (await listProviderRows()).map(serializePaymentProvider),
    '/api/v1/payment-providers'
  )
}

export async function listProviderConnections(tenantId: string) {
  return list(
    (await listProviderConnectionRows(tenantId)).map(
      serializeProviderConnection
    ),
    '/api/v1/payment-providers/connections'
  )
}

export async function createProviderConnection(
  tenantId: string,
  body: ProviderConnectionCreateBody
) {
  if (!(await findActiveProviderRow(body.providerId))) {
    throw new AppHttpError({
      code: 'payment_provider/not-found',
      message: 'Payment provider not found.',
      httpStatus: 404,
    })
  }
  return serializeProviderConnection(
    await createProviderConnectionRow(
      tenantId,
      generateId('ppconn'),
      body,
      nowUnixSeconds()
    )
  )
}

export async function updateProviderConnection(
  tenantId: string,
  id: string,
  body: ProviderConnectionUpdateBody
) {
  const row = await updateProviderConnectionRow(
    tenantId,
    id,
    body,
    nowUnixSeconds()
  )
  if (!row) {
    throw new AppHttpError({
      code: 'payment_provider_connection/not-found',
      message: 'Provider connection not found.',
      httpStatus: 404,
    })
  }
  return serializeProviderConnection(row)
}
