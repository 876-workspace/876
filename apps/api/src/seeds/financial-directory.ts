import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BANK_BRANCH_TYPES,
  CREDIT_UNION_BRANCH_TYPES,
  INSTITUTION_TYPES,
  LOCATION_STATUSES,
  isOneOf,
} from '@/platform/financial-directory-vocabulary'
import { getLogger } from '@/platform/logger'
import { isoToUnixSeconds } from '@/platform/timestamps'

import type { SeedAddress } from './financial-directory.repository'

const log = getLogger('seeds:financial-directory')
const SCHEMA_VERSION = 2
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const URL_PATTERN = /^https?:\/\/\S+$/

type CatalogSource = { name: string; as_of: string; url: string }

/**
 * A reviewed structured address. Coordinates are deliberately absent: the
 * catalog stores a verified street address and lets a trusted geocode fill the
 * coordinates later, so nothing is ever invented.
 */
export type CatalogAddress = {
  line1: string
  line2?: string | null
  city: string
  state: string
  postal_code?: string | null
  country?: string
}

export type CatalogBank = {
  bank_code: string
  name: string
  short_name?: string | null
  institution_type: string
  clearing_system?: string | null
  website?: string | null
  general_phone?: string | null
  support_phone?: string | null
  support_email?: string | null
  complaints_email?: string | null
  contact_url?: string | null
  source_url?: string | null
  source_as_of?: string | null
  last_verified_at?: string | null
}

export type CatalogBranch = {
  bank_code: string
  transit: string
  check_digit: string
  aba: string
  name: string
  /** Source text retained in the versioned catalog; never coerced into geocoded Core fields. */
  address?: string
  branch_type?: string | null
  status?: string | null
  contact_number?: string | null
  operating_hours?: string | null
  structured_address?: CatalogAddress | null
  source_url?: string | null
  source_as_of?: string | null
  last_verified_at?: string | null
}

export type CatalogCreditUnion = {
  code: string
  name: string
  short_name?: string | null
  headquarters?: string | null
  website?: string | null
  general_phone?: string | null
  support_phone?: string | null
  support_email?: string | null
  complaints_email?: string | null
  contact_url?: string | null
  source_url?: string | null
  source_as_of?: string | null
  last_verified_at?: string | null
}

export type CatalogCreditUnionBranch = {
  credit_union_code: string
  code: string
  name: string
  /** Verbatim public address retained when a location cannot be normalized safely. */
  address?: string | null
  contact_number?: string | null
  email?: string | null
  operating_hours?: string | null
  branch_type?: string | null
  status?: string | null
  structured_address?: CatalogAddress | null
  source_url?: string | null
  source_as_of?: string | null
  last_verified_at?: string | null
}

export type FinancialDirectoryCatalog = {
  schema_version: number
  catalog_revision: string
  country_code: string
  sources: CatalogSource[]
  banks: CatalogBank[]
  branches: CatalogBranch[]
  credit_unions: CatalogCreditUnion[]
  credit_union_branches: CatalogCreditUnionBranch[]
}

export type FinancialDirectorySeedSummary = {
  revision: string
  banksCreated: number
  banksUpdated: number
  banksDeletedPreserved: number
  branchesCreated: number
  branchesUpdated: number
  branchesWithStructuredLocation: number
  branchesWithoutStructuredLocation: number
  branchesDeletedPreserved: number
  creditUnionsCreated: number
  creditUnionsUpdated: number
  creditUnionsDeletedPreserved: number
  creditUnionBranchesCreated: number
  creditUnionBranchesUpdated: number
  creditUnionBranchesDeletedPreserved: number
}

/**
 * The gaps a reviewed snapshot still has. Every list holds stable identifiers
 * (`bank_code:transit` for bank branches, `code` elsewhere) so the report can be
 * diffed between runs.
 */
export type FinancialDirectoryAudit = {
  revision: string
  countryCode: string
  banks: {
    total: number
    missingWebsite: string[]
    missingContact: string[]
    missingProvenance: string[]
  }
  branches: {
    total: number
    missingStructuredLocation: string[]
    missingContact: string[]
    missingOperatingHours: string[]
    missingProvenance: string[]
  }
  creditUnions: {
    total: number
    missingContact: string[]
    missingProvenance: string[]
    withoutBranches: string[]
  }
  creditUnionBranches: {
    total: number
    missingProvenance: string[]
  }
}

export class FinancialDirectoryCatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinancialDirectoryCatalogError'
  }
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new FinancialDirectoryCatalogError(message)
}

function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
}

type SourcedRecord = {
  source_url?: string | null
  source_as_of?: string | null
  last_verified_at?: string | null
}

function requireSourceFields(record: SourcedRecord, label: string): void {
  if (record.source_url != null)
    requireCondition(
      URL_PATTERN.test(record.source_url),
      `${label}: source_url must be an http(s) URL`
    )
  if (record.source_as_of != null)
    requireCondition(
      isIsoDate(record.source_as_of),
      `${label}: source_as_of must be YYYY-MM-DD`
    )
  if (record.last_verified_at != null)
    requireCondition(
      isIsoDate(record.last_verified_at),
      `${label}: last_verified_at must be YYYY-MM-DD`
    )
}

function requireStructuredAddress(
  address: CatalogAddress | null | undefined,
  label: string
): void {
  if (address == null) return

  requireCondition(
    Boolean(address.line1.trim()),
    `${label}: structured_address.line1 is required`
  )
  requireCondition(
    Boolean(address.city.trim()),
    `${label}: structured_address.city is required`
  )
  requireCondition(
    Boolean(address.state.trim()),
    `${label}: structured_address.state is required`
  )
  requireCondition(
    address.country == null || /^[A-Z]{2}$/.test(address.country),
    `${label}: structured_address.country must be ISO alpha-2 uppercase`
  )
}

function toSeedAddress(address: CatalogAddress): SeedAddress {
  return {
    line1: address.line1.trim(),
    line2: address.line2 ?? null,
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postal_code ?? null,
    country: address.country ?? 'JM',
  }
}

/** Source verification dates are date-only; Unix seconds at UTC midnight. */
function verifiedAt(value: string | null | undefined): bigint | null {
  return value ? BigInt(isoToUnixSeconds(`${value}T00:00:00Z`)) : null
}

export function validateFinancialDirectoryCatalog(
  catalog: FinancialDirectoryCatalog
): void {
  requireCondition(
    catalog.schema_version === SCHEMA_VERSION,
    `unsupported catalog schema_version ${String(catalog.schema_version)}`
  )
  requireCondition(
    isIsoDate(catalog.catalog_revision),
    'catalog_revision must be YYYY-MM-DD'
  )
  requireCondition(
    /^[A-Z]{2}$/.test(catalog.country_code),
    'country_code must be ISO alpha-2 uppercase'
  )
  requireCondition(
    catalog.sources.length > 0,
    'catalog must declare at least one source'
  )
  requireCondition(catalog.banks.length > 0, 'catalog must contain banks')

  const bankCodes = new Set<string>()
  for (const bank of catalog.banks) {
    const label = `bank ${bank.bank_code}`
    requireCondition(
      /^\d{3}$/.test(bank.bank_code),
      `invalid bank_code ${bank.bank_code}`
    )
    requireCondition(
      !bankCodes.has(bank.bank_code),
      `duplicate bank_code ${bank.bank_code}`
    )
    requireCondition(
      Boolean(bank.name.trim()),
      `${bank.bank_code}: bank name is required`
    )
    requireCondition(
      isOneOf(INSTITUTION_TYPES, bank.institution_type),
      `${label}: unknown institution_type ${bank.institution_type}`
    )
    requireCondition(
      bank.website == null || URL_PATTERN.test(bank.website),
      `${label}: website must be an http(s) URL`
    )
    requireSourceFields(bank, label)
    bankCodes.add(bank.bank_code)
  }

  const branchKeys = new Set<string>()
  for (const branch of catalog.branches) {
    const label = `branch ${branch.bank_code}:${branch.transit}`
    requireCondition(
      bankCodes.has(branch.bank_code),
      `branch references unknown bank_code ${branch.bank_code}`
    )
    requireCondition(
      /^\d{5}$/.test(branch.transit),
      `invalid branch transit ${branch.transit}`
    )
    requireCondition(
      /^\d$/.test(branch.check_digit),
      `invalid check digit for ${branch.transit}`
    )
    requireCondition(
      /^\d{9}$/.test(branch.aba),
      `invalid ABA for ${branch.transit}`
    )
    requireCondition(
      branch.aba ===
        `${branch.transit}${branch.bank_code}${branch.check_digit}`,
      `ABA ${branch.aba} does not match transit/bank/check digit for ${branch.transit}`
    )
    requireCondition(
      Boolean(branch.name.trim()),
      `${branch.transit}: branch name is required`
    )
    requireCondition(
      branch.branch_type == null ||
        isOneOf(BANK_BRANCH_TYPES, branch.branch_type),
      `${label}: unknown branch_type ${branch.branch_type}`
    )
    requireCondition(
      branch.status == null || isOneOf(LOCATION_STATUSES, branch.status),
      `${label}: unknown status ${branch.status}`
    )
    requireStructuredAddress(branch.structured_address, label)
    requireSourceFields(branch, label)
    const key = `${branch.bank_code}:${branch.transit}`
    requireCondition(!branchKeys.has(key), `duplicate branch ${key}`)
    branchKeys.add(key)
  }

  const creditUnionCodes = new Set<string>()
  for (const creditUnion of catalog.credit_unions) {
    const label = `credit union ${creditUnion.code}`
    requireCondition(
      /^[a-z0-9][a-z0-9-]*$/.test(creditUnion.code),
      `invalid credit union code ${creditUnion.code}`
    )
    requireCondition(
      !creditUnionCodes.has(creditUnion.code),
      `duplicate credit union code ${creditUnion.code}`
    )
    requireCondition(
      Boolean(creditUnion.name.trim()),
      `${creditUnion.code}: credit union name is required`
    )
    requireCondition(
      creditUnion.website == null || URL_PATTERN.test(creditUnion.website),
      `${label}: website must be an http(s) URL`
    )
    requireSourceFields(creditUnion, label)
    creditUnionCodes.add(creditUnion.code)
  }

  const creditUnionBranchCodes = new Set<string>()
  for (const branch of catalog.credit_union_branches) {
    const label = `credit union branch ${branch.code}`
    requireCondition(
      creditUnionCodes.has(branch.credit_union_code),
      `branch references unknown credit_union_code ${branch.credit_union_code}`
    )
    requireCondition(
      /^[a-z0-9][a-z0-9-]*$/.test(branch.code),
      `invalid credit union branch code ${branch.code}`
    )
    requireCondition(
      !creditUnionBranchCodes.has(branch.code),
      `duplicate credit union branch code ${branch.code}`
    )
    requireCondition(
      Boolean(branch.name.trim()),
      `${branch.code}: branch name is required`
    )
    requireCondition(
      branch.branch_type == null ||
        isOneOf(CREDIT_UNION_BRANCH_TYPES, branch.branch_type),
      `${label}: unknown branch_type ${branch.branch_type}`
    )
    requireCondition(
      branch.status == null || isOneOf(LOCATION_STATUSES, branch.status),
      `${label}: unknown status ${branch.status}`
    )
    requireCondition(
      branch.address != null || branch.structured_address != null,
      `${label}: address or structured_address is required`
    )
    requireStructuredAddress(branch.structured_address, label)
    requireSourceFields(branch, label)
    creditUnionBranchCodes.add(branch.code)
  }
}

function catalogPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return resolve(
    currentDir,
    '../../data/financial/jamaica-directory-2026-09.json'
  )
}

export function loadFinancialDirectoryCatalog(
  path: string = catalogPath()
): FinancialDirectoryCatalog {
  const catalog = JSON.parse(
    readFileSync(path, 'utf-8')
  ) as FinancialDirectoryCatalog
  validateFinancialDirectoryCatalog(catalog)
  return catalog
}

/**
 * Seeds country-scoped bank, branch and credit-union reference data.
 *
 * Routing identity and physical location are deliberately separate concerns.
 * The authoritative clearing catalog is sufficient to create a BankBranch with
 * its bank, transit number and routing number. A structured DirectoryAddress is
 * optional enrichment and is never fabricated from a free-form address or an
 * inferred geocode. The source address remains preserved in the versioned
 * catalog until a trusted location workflow enriches the branch.
 *
 * Every write is an idempotent upsert and a tombstoned row is reported rather
 * than resurrected, so a reseed never undoes an operator's deletion.
 */
export async function seedFinancialDirectory(
  catalog?: FinancialDirectoryCatalog
): Promise<FinancialDirectorySeedSummary> {
  const {
    findSeedCountry,
    upsertSeedBank,
    upsertSeedBranch,
    upsertSeedCreditUnion,
    upsertSeedCreditUnionBranch,
  } = await import('./financial-directory.repository')
  const resolved = catalog ?? loadFinancialDirectoryCatalog()
  validateFinancialDirectoryCatalog(resolved)

  if (!(await findSeedCountry(resolved.country_code)))
    throw new FinancialDirectoryCatalogError(
      `country ${resolved.country_code} does not exist; run the geo seed first`
    )

  const summary: FinancialDirectorySeedSummary = {
    revision: resolved.catalog_revision,
    banksCreated: 0,
    banksUpdated: 0,
    banksDeletedPreserved: 0,
    branchesCreated: 0,
    branchesUpdated: 0,
    branchesWithStructuredLocation: 0,
    branchesWithoutStructuredLocation: 0,
    branchesDeletedPreserved: 0,
    creditUnionsCreated: 0,
    creditUnionsUpdated: 0,
    creditUnionsDeletedPreserved: 0,
    creditUnionBranchesCreated: 0,
    creditUnionBranchesUpdated: 0,
    creditUnionBranchesDeletedPreserved: 0,
  }
  const bankIds = new Map<string, string>()
  const creditUnionIds = new Map<string, string>()

  for (const bank of resolved.banks) {
    const result = await upsertSeedBank({
      countryCode: resolved.country_code,
      bankCode: bank.bank_code,
      name: bank.name,
      shortName: bank.short_name ?? null,
      clearingSystem: bank.clearing_system ?? null,
      institutionType: bank.institution_type,
      website: bank.website ?? null,
      generalPhone: bank.general_phone ?? null,
      supportPhone: bank.support_phone ?? null,
      supportEmail: bank.support_email ?? null,
      complaintsEmail: bank.complaints_email ?? null,
      contactUrl: bank.contact_url ?? null,
      sourceUrl: bank.source_url ?? null,
      sourceAsOf: bank.source_as_of ?? null,
      lastVerifiedAt: verifiedAt(bank.last_verified_at),
    })
    bankIds.set(bank.bank_code, result.id)
    if (result.deleted) summary.banksDeletedPreserved += 1
    else if (result.created) summary.banksCreated += 1
    else summary.banksUpdated += 1
  }

  for (const branch of resolved.branches) {
    const bankId = bankIds.get(branch.bank_code)
    if (!bankId)
      throw new FinancialDirectoryCatalogError(
        `bank ${branch.bank_code} was not seeded`
      )

    const result = await upsertSeedBranch({
      bankId,
      transitNumber: branch.transit,
      routingNumber: branch.aba,
      name: branch.name,
      rawAddress: branch.address ?? null,
      contactNumber: branch.contact_number ?? null,
      operatingHours: branch.operating_hours ?? null,
      branchType: branch.branch_type ?? null,
      status: branch.status ?? null,
      sourceUrl: branch.source_url ?? null,
      sourceAsOf: branch.source_as_of ?? null,
      lastVerifiedAt: verifiedAt(branch.last_verified_at),
      address: branch.structured_address
        ? toSeedAddress(branch.structured_address)
        : null,
    })
    if (result === 'created') {
      summary.branchesCreated += 1

      // The clearing catalog is authoritative for routing identity, not for
      // Core's structured/geocoded DirectoryAddress. Track that distinction in
      // the seed summary instead of inventing location data.
      if (branch.structured_address) summary.branchesWithStructuredLocation += 1
      else summary.branchesWithoutStructuredLocation += 1
    } else if (result === 'updated') {
      summary.branchesUpdated += 1
    } else {
      summary.branchesDeletedPreserved += 1
    }
  }

  for (const creditUnion of resolved.credit_unions) {
    const result = await upsertSeedCreditUnion({
      code: creditUnion.code,
      name: creditUnion.name,
      shortName: creditUnion.short_name ?? null,
      headquarters: creditUnion.headquarters ?? null,
      website: creditUnion.website ?? null,
      generalPhone: creditUnion.general_phone ?? null,
      supportPhone: creditUnion.support_phone ?? null,
      supportEmail: creditUnion.support_email ?? null,
      complaintsEmail: creditUnion.complaints_email ?? null,
      contactUrl: creditUnion.contact_url ?? null,
      sourceUrl: creditUnion.source_url ?? null,
      sourceAsOf: creditUnion.source_as_of ?? null,
      lastVerifiedAt: verifiedAt(creditUnion.last_verified_at),
    })
    creditUnionIds.set(creditUnion.code, result.id)
    if (result.deleted) summary.creditUnionsDeletedPreserved += 1
    else if (result.created) summary.creditUnionsCreated += 1
    else summary.creditUnionsUpdated += 1
  }

  for (const branch of resolved.credit_union_branches) {
    const creditUnionId = creditUnionIds.get(branch.credit_union_code)
    if (!creditUnionId)
      throw new FinancialDirectoryCatalogError(
        `credit union ${branch.credit_union_code} was not seeded`
      )

    const result = await upsertSeedCreditUnionBranch({
      creditUnionId,
      code: branch.code,
      name: branch.name,
      rawAddress: branch.address ?? null,
      contactNumber: branch.contact_number ?? null,
      email: branch.email ?? null,
      operatingHours: branch.operating_hours ?? null,
      branchType: branch.branch_type ?? null,
      status: branch.status ?? null,
      sourceUrl: branch.source_url ?? null,
      sourceAsOf: branch.source_as_of ?? null,
      lastVerifiedAt: verifiedAt(branch.last_verified_at),
      address: branch.structured_address
        ? toSeedAddress(branch.structured_address)
        : null,
    })
    if (result === 'created') summary.creditUnionBranchesCreated += 1
    else if (result === 'updated') summary.creditUnionBranchesUpdated += 1
    else summary.creditUnionBranchesDeletedPreserved += 1
  }

  log.info({ summary }, 'financial_directory.seed.completed')
  return summary
}

function hasBankContact(bank: CatalogBank): boolean {
  return [
    bank.general_phone,
    bank.support_phone,
    bank.support_email,
    bank.complaints_email,
    bank.contact_url,
  ].some((value) => Boolean(value))
}

function hasCreditUnionContact(creditUnion: CatalogCreditUnion): boolean {
  return [
    creditUnion.general_phone,
    creditUnion.support_phone,
    creditUnion.support_email,
    creditUnion.complaints_email,
    creditUnion.contact_url,
  ].some((value) => Boolean(value))
}

/**
 * Reports what a reviewed snapshot still lacks. Run before an import to see the
 * enrichment gap, and after a source refresh to see what the refresh closed.
 *
 * This audits the catalog alone; whether the database matches it is what the
 * seed summary reports after a run.
 */
export function auditFinancialDirectoryCatalog(
  catalog: FinancialDirectoryCatalog
): FinancialDirectoryAudit {
  validateFinancialDirectoryCatalog(catalog)

  const creditUnionsWithBranches = new Set(
    catalog.credit_union_branches.map((branch) => branch.credit_union_code)
  )

  return {
    revision: catalog.catalog_revision,
    countryCode: catalog.country_code,
    banks: {
      total: catalog.banks.length,
      missingWebsite: catalog.banks
        .filter((bank) => !bank.website)
        .map((bank) => bank.bank_code),
      missingContact: catalog.banks
        .filter((bank) => !hasBankContact(bank))
        .map((bank) => bank.bank_code),
      missingProvenance: catalog.banks
        .filter((bank) => !bank.source_url)
        .map((bank) => bank.bank_code),
    },
    branches: {
      total: catalog.branches.length,
      missingStructuredLocation: catalog.branches
        .filter((branch) => !branch.structured_address)
        .map((branch) => `${branch.bank_code}:${branch.transit}`),
      missingContact: catalog.branches
        .filter((branch) => !branch.contact_number)
        .map((branch) => `${branch.bank_code}:${branch.transit}`),
      missingOperatingHours: catalog.branches
        .filter((branch) => !branch.operating_hours)
        .map((branch) => `${branch.bank_code}:${branch.transit}`),
      missingProvenance: catalog.branches
        .filter((branch) => !branch.source_url)
        .map((branch) => `${branch.bank_code}:${branch.transit}`),
    },
    creditUnions: {
      total: catalog.credit_unions.length,
      missingContact: catalog.credit_unions
        .filter((creditUnion) => !hasCreditUnionContact(creditUnion))
        .map((creditUnion) => creditUnion.code),
      missingProvenance: catalog.credit_unions
        .filter((creditUnion) => !creditUnion.source_url)
        .map((creditUnion) => creditUnion.code),
      withoutBranches: catalog.credit_unions
        .filter(
          (creditUnion) => !creditUnionsWithBranches.has(creditUnion.code)
        )
        .map((creditUnion) => creditUnion.code),
    },
    creditUnionBranches: {
      total: catalog.credit_union_branches.length,
      missingProvenance: catalog.credit_union_branches
        .filter((branch) => !branch.source_url)
        .map((branch) => branch.code),
    },
  }
}
