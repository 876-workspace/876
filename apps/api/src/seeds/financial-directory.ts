import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getLogger } from '@/platform/logger'

import {
  enrichSeedBranch,
  findSeedCountry,
  upsertSeedBank,
} from './financial-directory.repository'

const log = getLogger('seeds:financial-directory')
const SCHEMA_VERSION = 1

type CatalogBank = {
  bank_code: string
  name: string
  short_name?: string | null
  institution_type: string
  clearing_system?: string | null
}

type CatalogBranch = {
  bank_code: string
  transit: string
  check_digit: string
  aba: string
  name: string
  address?: string
}

export type FinancialDirectoryCatalog = {
  schema_version: number
  catalog_revision: string
  country_code: string
  sources: Array<{ name: string; as_of: string; url: string }>
  banks: CatalogBank[]
  branches: CatalogBranch[]
}

export type FinancialDirectorySeedSummary = {
  revision: string
  banksCreated: number
  banksUpdated: number
  banksDeletedPreserved: number
  branchesEnriched: number
  branchesPendingLocation: number
  branchesDeletedPreserved: number
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

export function validateFinancialDirectoryCatalog(
  catalog: FinancialDirectoryCatalog
): void {
  requireCondition(
    catalog.schema_version === SCHEMA_VERSION,
    `unsupported catalog schema_version ${String(catalog.schema_version)}`
  )
  requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(catalog.catalog_revision), 'catalog_revision must be YYYY-MM-DD')
  requireCondition(/^[A-Z]{2}$/.test(catalog.country_code), 'country_code must be ISO alpha-2 uppercase')
  requireCondition(catalog.sources.length > 0, 'catalog must declare at least one source')
  requireCondition(catalog.banks.length > 0, 'catalog must contain banks')

  const bankCodes = new Set<string>()
  for (const bank of catalog.banks) {
    requireCondition(/^\d{3}$/.test(bank.bank_code), `invalid bank_code ${bank.bank_code}`)
    requireCondition(!bankCodes.has(bank.bank_code), `duplicate bank_code ${bank.bank_code}`)
    requireCondition(Boolean(bank.name.trim()), `${bank.bank_code}: bank name is required`)
    requireCondition(Boolean(bank.institution_type.trim()), `${bank.bank_code}: institution_type is required`)
    bankCodes.add(bank.bank_code)
  }

  const branchKeys = new Set<string>()
  for (const branch of catalog.branches) {
    requireCondition(bankCodes.has(branch.bank_code), `branch references unknown bank_code ${branch.bank_code}`)
    requireCondition(/^\d{5}$/.test(branch.transit), `invalid branch transit ${branch.transit}`)
    requireCondition(/^\d$/.test(branch.check_digit), `invalid check digit for ${branch.transit}`)
    requireCondition(/^\d{9}$/.test(branch.aba), `invalid ABA for ${branch.transit}`)
    requireCondition(
      branch.aba === `${branch.transit}${branch.bank_code}${branch.check_digit}`,
      `ABA ${branch.aba} does not match transit/bank/check digit for ${branch.transit}`
    )
    requireCondition(Boolean(branch.name.trim()), `${branch.transit}: branch name is required`)
    const key = `${branch.bank_code}:${branch.transit}`
    requireCondition(!branchKeys.has(key), `duplicate branch ${key}`)
    branchKeys.add(key)
  }
}

function catalogPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return resolve(currentDir, '../../data/financial/jamaica-ach-2026-03.json')
}

export function loadFinancialDirectoryCatalog(
  path: string = catalogPath()
): FinancialDirectoryCatalog {
  const catalog = JSON.parse(readFileSync(path, 'utf-8')) as FinancialDirectoryCatalog
  validateFinancialDirectoryCatalog(catalog)
  return catalog
}

/**
 * Seeds country-scoped bank reference data and enriches existing branch records.
 *
 * The APL catalog does not publish geocoordinates while Core directory addresses
 * require them. The seed therefore never creates a new BankBranch with guessed
 * coordinates. Unmatched branches remain in the versioned catalog and are
 * reported as `branchesPendingLocation` until a trustworthy address/geocode is
 * added to Core through the directory-data workflow.
 */
export async function seedFinancialDirectory(
  catalog?: FinancialDirectoryCatalog
): Promise<FinancialDirectorySeedSummary> {
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
    branchesEnriched: 0,
    branchesPendingLocation: 0,
    branchesDeletedPreserved: 0,
  }
  const bankIds = new Map<string, string>()

  for (const bank of resolved.banks) {
    const result = await upsertSeedBank({
      countryCode: resolved.country_code,
      bankCode: bank.bank_code,
      name: bank.name,
      shortName: bank.short_name ?? null,
      clearingSystem: bank.clearing_system ?? null,
      institutionType: bank.institution_type,
    })
    bankIds.set(bank.bank_code, result.id)
    if (result.deleted) summary.banksDeletedPreserved += 1
    else if (result.created) summary.banksCreated += 1
    else summary.banksUpdated += 1
  }

  for (const branch of resolved.branches) {
    const bankId = bankIds.get(branch.bank_code)
    if (!bankId) throw new FinancialDirectoryCatalogError(`bank ${branch.bank_code} was not seeded`)

    const result = await enrichSeedBranch({
      bankId,
      transitNumber: branch.transit,
      routingNumber: branch.aba,
      name: branch.name,
    })
    if (result === 'updated') summary.branchesEnriched += 1
    else if (result === 'deleted') summary.branchesDeletedPreserved += 1
    else summary.branchesPendingLocation += 1
  }

  log.info({ summary }, 'financial_directory.seed.completed')
  return summary
}
