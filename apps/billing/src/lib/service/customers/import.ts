import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import {
  CustomerImportRowSchema,
  type CustomerImportRequest,
  type CustomerImportResult,
  type CustomerImportRowOutcome,
} from '@/types/customer-import'

import { err, ok } from '../result'

/** A row that passed validation and is a candidate for insertion. */
type ValidRow = {
  index: number
  data: ReturnType<typeof CustomerImportRowSchema.parse>
  /** Dedup key, or null when the row carries neither externalReference nor email. */
  dedupKey: string | null
}

/**
 * Bulk-imports EXTERNAL customers from mapped file rows. Invalid rows are
 * reported as failed, rows matching an existing customer (by externalReference,
 * else email, within the tenant) or an earlier row in the same file are skipped,
 * and the remainder are inserted. Never throws for partial failures — the
 * summary reports every row's outcome.
 */
export async function importCustomers(
  tenantId: string,
  request: CustomerImportRequest
): ServiceResult<CustomerImportResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true, defaultLanguage: true },
  })
  if (!tenant) return err('Workspace not found.', 404)

  const enabledCurrencies = new Set(
    (
      await prisma.tenantCurrency.findMany({
        where: { tenantId, isEnabled: true, currency: { isActive: true } },
        select: { currencyCode: true },
      })
    ).map((row) => row.currencyCode)
  )

  const rows = request.rows
  const outcomes: CustomerImportRowOutcome[] = new Array(rows.length)
  const valid: ValidRow[] = []

  // Pass 1 — validate each row and resolve its dedup key.
  for (let index = 0; index < rows.length; index++) {
    const parsed = CustomerImportRowSchema.safeParse(rows[index])
    if (!parsed.success) {
      outcomes[index] = {
        index,
        name: displayName(rows[index]),
        status: 'failed',
        reason: parsed.error.issues[0]?.message ?? 'Invalid customer details.',
      }
      continue
    }

    const data = parsed.data
    if (data.currency && !enabledCurrencies.has(data.currency)) {
      outcomes[index] = {
        index,
        name: data.name,
        status: 'failed',
        reason: `Currency ${data.currency} is not enabled in this workspace.`,
      }
      continue
    }

    valid.push({ index, data, dedupKey: dedupKeyFor(data) })
  }

  // Pass 2 — mark rows that duplicate an existing customer or an earlier row.
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

  // Pass 3 — insert the survivors. skipDuplicates guards the rare race where a
  // unique key was created between the precheck and this write.
  const now = nowUnixSeconds()
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

  // Reconcile a rare createMany skip (unique race): flip the trailing shortfall.
  const shortfall = toInsert.length - created.count
  for (let i = 0; i < shortfall; i++) {
    const row = toInsert[toInsert.length - 1 - i]
    outcomes[row.index] = {
      index: row.index,
      name: row.data.name,
      status: 'skipped',
      reason: 'A customer with this email or external ID already exists.',
    }
  }

  const imported = outcomes.filter((row) => row.status === 'imported').length
  const skipped = outcomes.filter((row) => row.status === 'skipped').length
  const failed = outcomes.filter((row) => row.status === 'failed').length

  return ok({
    object: 'customer_import',
    total: rows.length,
    imported,
    skipped,
    failed,
    rows: outcomes,
  })
}

/** externalReference wins over email as the dedup key, mirroring the create path. */
function dedupKeyFor(
  data: ReturnType<typeof CustomerImportRowSchema.parse>
): string | null {
  if (data.externalReference) return `ext:${data.externalReference}`
  if (data.email) return `email:${data.email.toLowerCase()}`
  return null
}

/** Loads the dedup keys already present in the tenant for the candidate rows. */
async function findExistingKeys(
  tenantId: string,
  valid: ValidRow[]
): Promise<Set<string>> {
  const externalReferences = unique(
    valid.map((row) => row.data.externalReference).filter(isPresent)
  )
  const emails = unique(
    valid.map((row) => row.data.email?.toLowerCase()).filter(isPresent)
  )

  const keys = new Set<string>()
  if (externalReferences.length === 0 && emails.length === 0) return keys

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
  return Array.from(new Set(values))
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
