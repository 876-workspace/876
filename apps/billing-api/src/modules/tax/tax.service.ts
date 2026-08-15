import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createTaxAuthorityRow,
  createTaxRateRow,
  findActiveTaxAuthorityRow,
  findTaxAuthorityRow,
  findTaxRateRow,
  listTaxAuthorityRows,
  listTaxRateRows,
  updateTaxAuthorityRow,
  updateTaxRateRow,
} from './tax.repository'
import type {
  TaxAuthorityCreateBody,
  TaxAuthorityUpdateBody,
  TaxRateCreateBody,
  TaxRateUpdateBody,
} from './tax.schemas'
import { serializeTaxAuthority, serializeTaxRate } from './tax.serializers'

function list<T>(data: T[], url: string) {
  return {
    object: 'list' as const,
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

export async function listTaxAuthorities(tenantId: string) {
  return list(
    (await listTaxAuthorityRows(tenantId)).map(serializeTaxAuthority),
    '/api/v1/tax-authorities'
  )
}

export async function createTaxAuthority(
  tenantId: string,
  body: TaxAuthorityCreateBody
) {
  try {
    return serializeTaxAuthority(
      await createTaxAuthorityRow(
        tenantId,
        generateId('taxauth'),
        body,
        nowUnixSeconds()
      )
    )
  } catch (error) {
    if (isUnique(error)) {
      throw new AppHttpError({
        code: 'tax_authority/conflict',
        message: 'A tax authority with this name already exists.',
        httpStatus: 409,
      })
    }
    throw error
  }
}

export async function updateTaxAuthority(
  tenantId: string,
  id: string,
  body: TaxAuthorityUpdateBody
) {
  const existing = await findTaxAuthorityRow(tenantId, id)
  if (!existing) throw notFound('tax_authority', 'Tax authority not found.')
  if (body.isActive === false && existing.isDefault) {
    throw conflict(
      'Choose another default authority before archiving this one.'
    )
  }
  if (body.isDefault === false && existing.isDefault) {
    throw conflict('Choose another authority as the default instead.')
  }
  if (body.isDefault && body.isActive === false) {
    throw invalid('An archived authority cannot be the default.')
  }
  return serializeTaxAuthority(
    await updateTaxAuthorityRow(tenantId, id, body, nowUnixSeconds())
  )
}

export async function listTaxRates(tenantId: string) {
  return list(
    (await listTaxRateRows(tenantId)).map(serializeTaxRate),
    '/api/v1/tax-rates'
  )
}

export async function createTaxRate(tenantId: string, body: TaxRateCreateBody) {
  const authority = await findActiveTaxAuthorityRow(
    tenantId,
    body.taxAuthorityId
  )
  if (!authority) {
    throw invalid(
      body.taxAuthorityId
        ? 'Select an active tax authority from this workspace.'
        : 'Create or select a default tax authority first.'
    )
  }
  const row = await createTaxRateRow(
    tenantId,
    authority.id,
    generateId('taxrate'),
    body,
    nowUnixSeconds()
  )
  return serializeTaxRate(row)
}

export async function updateTaxRate(
  tenantId: string,
  id: string,
  body: TaxRateUpdateBody
) {
  const existing = await findTaxRateRow(tenantId, id)
  if (!existing) throw notFound('tax_rate', 'Tax rate not found.')
  if (body.isActive === false && existing.isDefault) {
    throw conflict('Choose another default rate before archiving this one.')
  }
  if (body.isDefault === false && existing.isDefault) {
    throw conflict('Choose another rate as the default instead.')
  }
  if (body.isDefault && body.isActive === false) {
    throw invalid('An archived rate cannot be the default.')
  }
  return serializeTaxRate(
    await updateTaxRateRow(tenantId, id, body, nowUnixSeconds())
  )
}

function isUnique(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
function notFound(code: string, message: string) {
  return new AppHttpError({
    code: `${code}/not-found`,
    message,
    httpStatus: 404,
  })
}
function conflict(message: string) {
  return new AppHttpError({
    code: 'tax/invalid-state',
    message,
    httpStatus: 409,
  })
}
function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}
