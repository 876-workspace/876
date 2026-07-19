import { createHash } from 'node:crypto'

import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'
import type {
  CustomerImportAttribution,
  CustomerImportParams,
  CustomerImportResult,
  CustomerImportRow,
  CustomerImportRowResult,
  CustomerUpdateParams,
} from '@/types/customer'
import { CustomerImportResultSchema } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'
import { create } from './create'
import { update } from './update'

type ImportDatabase = PrismaTransaction

type ImportTenant = {
  defaultCurrency: string
  defaultLanguage: string
}

type MatchResult =
  | { customerId: string | null; error: null }
  | { customerId: null; error: CustomerImportRowResult['error'] }

const SERVICE_ERROR_CODE_BY_STATUS: Partial<Record<number, string>> = {
  404: 'error/not-found',
  409: 'error/conflict',
  422: 'validation/invalid-request',
}

/** Imports external customers with one isolated transaction per mutating row. */
export async function importCustomers(
  tenantId: string,
  params: CustomerImportParams,
  attribution?: CustomerImportAttribution
): ServiceResult<CustomerImportResult> {
  const payloadHash = hashPayload(params)
  if (!params.dryRun && attribution) {
    const replay = await resolveReplay(tenantId, attribution, payloadHash)
    if (replay) return replay
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true, defaultLanguage: true },
  })
  if (!tenant) return err('Workspace not found.', 404)

  const results: CustomerImportRowResult[] = []
  for (const row of params.rows) {
    const result = params.dryRun
      ? await planRow(prisma, tenantId, tenant, row, params.duplicateStrategy)
      : await applyRow(tenantId, tenant, row, params.duplicateStrategy)

    results.push(result)
  }

  const result = buildResult(params, results)
  if (!params.dryRun && attribution) {
    const receipt = await storeReceipt(
      tenantId,
      attribution,
      payloadHash,
      result
    )
    if (receipt.error !== null) return receipt
    if (receipt.data) return ok(receipt.data)
  }

  return ok(result)
}

async function applyRow(
  tenantId: string,
  tenant: ImportTenant,
  row: CustomerImportRow,
  duplicateStrategy: CustomerImportParams['duplicateStrategy']
): Promise<CustomerImportRowResult> {
  try {
    return await prisma.$transaction((tx) =>
      planRow(tx, tenantId, tenant, row, duplicateStrategy, true)
    )
  } catch (error) {
    console.error(
      '[billing.service.customers.import.row]',
      { rowNumber: row.rowNumber },
      error
    )

    return failedRow(
      row.rowNumber,
      'error/unknown',
      'Failed to import this customer.'
    )
  }
}

async function planRow(
  database: ImportDatabase,
  tenantId: string,
  tenant: ImportTenant,
  row: CustomerImportRow,
  duplicateStrategy: CustomerImportParams['duplicateStrategy'],
  write = false
): Promise<CustomerImportRowResult> {
  const match = await matchCustomer(database, tenantId, row)
  if (match.error)
    return failedRow(row.rowNumber, match.error.code, match.error.message)

  if (match.customerId && duplicateStrategy === 'skip')
    return successfulRow(row.rowNumber, 'skipped', match.customerId)

  const validationError = await validateMutation(
    database,
    tenantId,
    tenant,
    row,
    match.customerId ? 'update' : 'create'
  )
  if (validationError)
    return failedRow(
      row.rowNumber,
      validationError.code,
      validationError.message
    )

  if (match.customerId)
    return updateMatchedCustomer(
      database,
      tenantId,
      match.customerId,
      row,
      write
    )

  return createCustomer(database, tenantId, row, write)
}

async function matchCustomer(
  database: ImportDatabase,
  tenantId: string,
  row: CustomerImportRow
): Promise<MatchResult> {
  if (row.customerNumber) {
    const numberedCustomer = await database.customer.findFirst({
      where: { tenantId, customerNumber: row.customerNumber },
      select: { id: true },
    })
    if (numberedCustomer)
      return { customerId: numberedCustomer.id, error: null }
  }

  if (row.email) {
    const emailMatches = await database.customer.findMany({
      where: {
        tenantId,
        email: { equals: row.email.trim().toLowerCase(), mode: 'insensitive' },
      },
      select: { id: true },
      take: 2,
    })
    if (emailMatches.length > 1) return ambiguousMatch()
    if (emailMatches[0]) return { customerId: emailMatches[0].id, error: null }
  }

  const nameMatches = await database.customer.findMany({
    where: {
      tenantId,
      name: { equals: row.name, mode: 'insensitive' },
    },
    select: { id: true },
    take: 2,
  })
  if (nameMatches.length > 1) return ambiguousMatch()

  return { customerId: nameMatches[0]?.id ?? null, error: null }
}

function ambiguousMatch(): MatchResult {
  return {
    customerId: null,
    error: {
      code: 'billing/import-ambiguous-match',
      message: 'Multiple customers match this import row.',
    },
  }
}

async function validateMutation(
  database: ImportDatabase,
  tenantId: string,
  tenant: ImportTenant,
  row: CustomerImportRow,
  action: 'create' | 'update'
): Promise<CustomerImportRowResult['error']> {
  const currency =
    action === 'create'
      ? (row.currency ?? tenant.defaultCurrency)
      : row.currency
  if (
    typeof currency === 'string' &&
    !(await hasEnabledCurrency(tenantId, currency, database))
  )
    return {
      code: 'validation/invalid-request',
      message: 'Enable the customer currency before using it.',
    }

  const language =
    action === 'create'
      ? (row.language ?? tenant.defaultLanguage)
      : row.language
  if (typeof language === 'string') {
    const activeLanguage = await database.language.findFirst({
      where: { code: language, isActive: true },
      select: { code: true },
    })
    if (!activeLanguage)
      return {
        code: 'validation/invalid-request',
        message: 'Use an active customer language.',
      }
  }

  return null
}

async function createCustomer(
  database: ImportDatabase,
  tenantId: string,
  row: CustomerImportRow,
  write: boolean
): Promise<CustomerImportRowResult> {
  if (!write) return successfulRow(row.rowNumber, 'created', null)

  const result = await create(
    tenantId,
    {
      customerType: 'EXTERNAL',
      customerKind: row.customerKind ?? 'INDIVIDUAL',
      name: row.name,
      salutation: row.salutation,
      firstName: row.firstName,
      lastName: row.lastName,
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      workPhone: row.workPhone,
      currency: row.currency,
      language: row.language,
      customerNumber: row.customerNumber,
      website: row.website,
      notes: row.notes,
      taxRegistrationNumber: row.taxRegistrationNumber,
      lateFeeExempt: false,
    },
    undefined,
    database
  )
  if (result.error !== null)
    return serviceFailedRow(row.rowNumber, result.error, result.status)

  const now = nowUnixSeconds()
  await createRelatedRows(database, tenantId, result.data.id, row, now)

  return successfulRow(row.rowNumber, 'created', result.data.id)
}

async function createRelatedRows(
  database: ImportDatabase,
  tenantId: string,
  customerId: string,
  row: CustomerImportRow,
  now: number
): Promise<void> {
  if (row.billingAddress)
    await database.address.create({
      data: {
        id: generateId('Address'),
        tenantId,
        customerId,
        type: 'billing',
        ...row.billingAddress,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    })

  if (row.shippingAddress)
    await database.address.create({
      data: {
        id: generateId('Address'),
        tenantId,
        customerId,
        type: 'shipping',
        ...row.shippingAddress,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    })

  if (row.contact)
    await database.contact.create({
      data: {
        id: generateId('Contact'),
        tenantId,
        customerId,
        ...row.contact,
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      },
    })
}

async function updateMatchedCustomer(
  database: ImportDatabase,
  tenantId: string,
  customerId: string,
  row: CustomerImportRow,
  write: boolean
): Promise<CustomerImportRowResult> {
  if (!write) return successfulRow(row.rowNumber, 'updated', customerId)

  const params: CustomerUpdateParams = {
    name: row.name,
    ...(row.customerKind !== undefined
      ? { customerKind: row.customerKind }
      : {}),
    ...(row.salutation !== undefined ? { salutation: row.salutation } : {}),
    ...(row.firstName !== undefined ? { firstName: row.firstName } : {}),
    ...(row.lastName !== undefined ? { lastName: row.lastName } : {}),
    ...(row.companyName !== undefined ? { companyName: row.companyName } : {}),
    ...(row.email !== undefined ? { email: row.email } : {}),
    ...(row.phone !== undefined ? { phone: row.phone } : {}),
    ...(row.workPhone !== undefined ? { workPhone: row.workPhone } : {}),
    ...(row.currency !== undefined ? { currency: row.currency } : {}),
    ...(row.language !== undefined ? { language: row.language } : {}),
    ...(row.customerNumber !== undefined
      ? { customerNumber: row.customerNumber }
      : {}),
    ...(row.website !== undefined ? { website: row.website } : {}),
    ...(row.notes !== undefined ? { notes: row.notes } : {}),
    ...(row.taxRegistrationNumber !== undefined
      ? { taxRegistrationNumber: row.taxRegistrationNumber }
      : {}),
  }
  const result = await update(tenantId, customerId, params, database)
  if (result.error !== null)
    return serviceFailedRow(row.rowNumber, result.error, result.status)

  return successfulRow(row.rowNumber, 'updated', customerId)
}

function successfulRow(
  rowNumber: number,
  action: Exclude<CustomerImportRowResult['action'], 'failed'>,
  customerId: string | null
): CustomerImportRowResult {
  return { rowNumber, action, customerId, error: null }
}

function serviceFailedRow(
  rowNumber: number,
  message: string,
  status?: number
): CustomerImportRowResult {
  const code = status
    ? (SERVICE_ERROR_CODE_BY_STATUS[status] ?? 'error/unknown')
    : 'error/unknown'

  return failedRow(rowNumber, code, message)
}

function failedRow(
  rowNumber: number,
  code: string,
  message: string
): CustomerImportRowResult {
  return {
    rowNumber,
    action: 'failed',
    customerId: null,
    error: { code, message },
  }
}

function buildResult(
  params: CustomerImportParams,
  results: CustomerImportRowResult[]
): CustomerImportResult {
  const summary = { created: 0, updated: 0, skipped: 0, failed: 0 }
  for (const result of results) summary[result.action] += 1

  return {
    object: 'customer_import',
    dryRun: params.dryRun,
    duplicateStrategy: params.duplicateStrategy,
    summary,
    results,
  }
}

async function resolveReplay(
  tenantId: string,
  attribution: CustomerImportAttribution,
  payloadHash: string
): Promise<Awaited<ServiceResult<CustomerImportResult>> | null> {
  const receipt = await prisma.customerImportReceipt.findUnique({
    where: {
      tenantId_sourceAppId_idempotencyKey: {
        tenantId,
        sourceAppId: attribution.sourceAppId,
        idempotencyKey: attribution.idempotencyKey,
      },
    },
  })
  if (!receipt) return null
  if (receipt.payloadHash !== payloadHash)
    return err(
      'This idempotency key was already used with different details.',
      409
    )

  const parsed = CustomerImportResultSchema.safeParse(receipt.result)
  if (!parsed.success) return err('The stored customer import is invalid.', 500)

  return ok(parsed.data)
}

async function storeReceipt(
  tenantId: string,
  attribution: CustomerImportAttribution,
  payloadHash: string,
  result: CustomerImportResult
): ServiceResult<CustomerImportResult | null> {
  try {
    await prisma.customerImportReceipt.create({
      data: {
        tenantId,
        sourceAppId: attribution.sourceAppId,
        idempotencyKey: attribution.idempotencyKey,
        payloadHash,
        result: JSON.parse(JSON.stringify(result)),
        createdAt: nowUnixSeconds(),
      },
    })

    return ok(null)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const replay = await resolveReplay(tenantId, attribution, payloadHash)
      if (replay) return replay
    }

    console.error('[billing.service.customers.import.receipt]', error)
    return err('Failed to store the customer import receipt.', 500)
  }
}

function hashPayload(params: CustomerImportParams): string {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex')
}
