import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

import {
  customerImportRowSchema,
  type CustomerImportBody,
  type CustomerImportRow,
} from './customers.schemas'

export type CustomerImportOutcome = {
  index: number
  name: string
  status: 'imported' | 'skipped' | 'failed'
  reason?: string
}

type ValidRow = {
  index: number
  data: CustomerImportRow
  dedupKey: string | null
}

export async function importCustomerRows(
  tenantId: string,
  request: CustomerImportBody,
  now: number
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true, defaultLanguage: true },
  })
  if (!tenant) return null

  const enabledCurrencies = new Set(
    (
      await prisma.tenantCurrency.findMany({
        where: { tenantId, isEnabled: true, currency: { isActive: true } },
        select: { currencyCode: true },
      })
    ).map((row) => row.currencyCode)
  )
  const outcomes: CustomerImportOutcome[] = new Array(request.rows.length)
  const valid: ValidRow[] = []

  request.rows.forEach((raw, index) => {
    const parsed = customerImportRowSchema.safeParse(raw)
    if (!parsed.success) {
      outcomes[index] = {
        index,
        name: displayName(raw),
        status: 'failed',
        reason: parsed.error.issues[0]?.message ?? 'Invalid customer details.',
      }
      return
    }
    if (parsed.data.currency && !enabledCurrencies.has(parsed.data.currency)) {
      outcomes[index] = {
        index,
        name: parsed.data.name,
        status: 'failed',
        reason: `Currency ${parsed.data.currency} is not enabled in this workspace.`,
      }
      return
    }
    valid.push({
      index,
      data: parsed.data,
      dedupKey: dedupKeyFor(parsed.data),
    })
  })

  const existing = await findExistingKeys(tenantId, valid)
  const seen = new Set<string>()
  const toInsert: ValidRow[] = []
  for (const row of valid) {
    const key = row.dedupKey
    if (key && (existing.has(key) || seen.has(key))) {
      outcomes[row.index] = {
        index: row.index,
        name: row.data.name,
        status: 'skipped',
        reason: 'A customer with this email or external ID already exists.',
      }
      continue
    }
    if (key) seen.add(key)
    toInsert.push(row)
  }

  const created = await prisma.customer.createMany({
    data: toInsert.map((row) => ({
      id: generateId('Customer'),
      tenantId,
      customerType: 'EXTERNAL' as const,
      customerKind: row.data.customerKind,
      name: row.data.name,
      salutation: row.data.salutation ?? null,
      firstName: row.data.firstName ?? null,
      lastName: row.data.lastName ?? null,
      companyName: row.data.companyName ?? null,
      email: row.data.email ?? null,
      phone: row.data.phone ?? null,
      workPhone: row.data.workPhone ?? null,
      externalReference: row.data.externalReference ?? null,
      defaultCurrency: row.data.currency ?? tenant.defaultCurrency,
      language: row.data.language ?? tenant.defaultLanguage,
      coreSyncedAt: null,
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })

  for (const row of toInsert)
    outcomes[row.index] = {
      index: row.index,
      name: row.data.name,
      status: 'imported',
    }
  const shortfall = toInsert.length - created.count
  for (let index = 0; index < shortfall; index++) {
    const row = toInsert[toInsert.length - 1 - index]
    if (!row) break
    outcomes[row.index] = {
      index: row.index,
      name: row.data.name,
      status: 'skipped',
      reason: 'A customer with this email or external ID already exists.',
    }
  }

  return outcomes
}

function dedupKeyFor(row: CustomerImportRow): string | null {
  if (row.externalReference) return `ext:${row.externalReference}`
  if (row.email) return `email:${row.email.toLowerCase()}`
  return null
}

async function findExistingKeys(tenantId: string, valid: ValidRow[]) {
  const externalReferences = unique(
    valid.map((row) => row.data.externalReference).filter(isPresent)
  )
  const emails = unique(
    valid.map((row) => row.data.email?.toLowerCase()).filter(isPresent)
  )
  if (externalReferences.length === 0 && emails.length === 0)
    return new Set<string>()

  const matches = await prisma.customer.findMany({
    where: {
      tenantId,
      OR: [
        externalReferences.length
          ? { externalReference: { in: externalReferences } }
          : undefined,
        emails.length
          ? { email: { in: emails, mode: 'insensitive' as const } }
          : undefined,
      ].filter(isPresent),
    },
    select: { externalReference: true, email: true },
  })
  const keys = new Set<string>()
  for (const match of matches) {
    if (match.externalReference) keys.add(`ext:${match.externalReference}`)
    if (match.email) keys.add(`email:${match.email.toLowerCase()}`)
  }
  return keys
}

function displayName(row: Record<string, string>): string {
  return typeof row.name === 'string' ? row.name.trim() : ''
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
