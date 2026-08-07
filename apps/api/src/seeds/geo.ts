import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getLogger } from '@/platform/logger'

import { upsertCountry, upsertRegion } from './geo.repository'

const log = getLogger('seeds:geo')

const SCHEMA_VERSION = 1
const JAMAICA_PARISH_COUNT = 14
const US_STATE_MINIMUM = 50

export class GeoCatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeoCatalogError'
  }
}

export type GeoCatalog = {
  schema_version: number
  catalog_revision: number
  countries: Array<{
    code: string
    name: string
    phone_prefix?: string | null
    default_currency_code?: string | null
    is_enabled?: boolean
    regions?: Array<{
      id: string
      code: string
      name: string
      type: string
      is_enabled?: boolean
    }>
  }>
}

export type GeoSeedSummary = {
  countries: number
  regions: number
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new GeoCatalogError(message)
}

function validateCatalog(catalog: GeoCatalog): void {
  requireCondition(
    catalog.schema_version === SCHEMA_VERSION,
    `unsupported catalog schema_version ${String(catalog.schema_version)}`
  )
  requireCondition(
    'catalog_revision' in catalog,
    'catalog is missing catalog_revision'
  )

  const countries = catalog.countries
  requireCondition(
    Array.isArray(countries) && countries.length > 0,
    'catalog has no countries'
  )

  const seenCountryCodes = new Set<string>()
  const seenRegionIds = new Set<string>()
  let parishCount = 0
  let stateCount = 0

  for (const country of countries) {
    const code = country.code
    requireCondition(
      typeof code === 'string' &&
        code.length === 2 &&
        code.toUpperCase() === code,
      `invalid ISO 3166-1 alpha-2 country code ${String(code)}`
    )
    requireCondition(
      !seenCountryCodes.has(code),
      `duplicate country code ${String(code)}`
    )
    seenCountryCodes.add(code)
    requireCondition(
      Boolean(country.name),
      `${code}: country is missing a name`
    )

    const seenRegionCodes = new Set<string>()
    for (const region of country.regions ?? []) {
      const regionId = region.id
      const regionCode = region.code
      const name = region.name
      const regionType = region.type

      requireCondition(Boolean(regionId), `${code}: region is missing an id`)
      requireCondition(
        !seenRegionIds.has(String(regionId)),
        `duplicate region id ${String(regionId)}`
      )
      seenRegionIds.add(String(regionId))

      requireCondition(
        Boolean(regionCode),
        `${code}: region ${String(regionId)} is missing a code`
      )
      requireCondition(
        !seenRegionCodes.has(String(regionCode)),
        `${code}: duplicate region code ${String(regionCode)}`
      )
      seenRegionCodes.add(String(regionCode))

      requireCondition(
        Boolean(name),
        `${code}: region ${String(regionId)} is missing a name`
      )
      requireCondition(
        typeof regionType === 'string' &&
          Boolean(regionType) &&
          regionType === regionType.toLowerCase(),
        `${code}: region ${String(regionId)} has an invalid type ${String(regionType)}`
      )

      if (region.is_enabled === false) continue
      if (code === 'JM' && region.type === 'parish') parishCount += 1
      if (code === 'US' && region.type === 'state') stateCount += 1
    }
  }

  requireCondition(
    parishCount === JAMAICA_PARISH_COUNT,
    `Jamaica must have exactly ${JAMAICA_PARISH_COUNT} enabled parishes, found ${parishCount}`
  )
  requireCondition(
    stateCount >= US_STATE_MINIMUM,
    `the United States must have at least ${US_STATE_MINIMUM} enabled states, found ${stateCount}`
  )
}

function catalogPath(): string {
  // data/geo/caribbean.json relative to repo root apps/api
  // src/seeds/geo.ts -> ../../data/geo/caribbean.json
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return resolve(currentDir, '../../data/geo/caribbean.json')
}

export function loadCatalog(path: string = catalogPath()): GeoCatalog {
  const raw = readFileSync(path, 'utf-8')
  const catalog = JSON.parse(raw) as GeoCatalog
  validateCatalog(catalog)
  return catalog
}

export { validateCatalog }

export async function seedGeoCatalog(
  catalog?: GeoCatalog
): Promise<GeoSeedSummary> {
  const resolved = catalog ?? loadCatalog()
  validateCatalog(resolved)

  let countryCount = 0
  let regionCount = 0

  for (const country of resolved.countries) {
    await upsertCountry({
      code: country.code,
      name: country.name,
      phonePrefix: country.phone_prefix ?? null,
      defaultCurrencyCode: country.default_currency_code ?? null,
      isEnabled: country.is_enabled ?? true,
    })
    countryCount += 1

    for (const region of country.regions ?? []) {
      await upsertRegion({
        id: region.id,
        countryCode: country.code,
        code: region.code,
        name: region.name,
        type: region.type,
        isEnabled: region.is_enabled ?? true,
      })
      regionCount += 1
    }
  }

  log.info(
    { countries: countryCount, regions: regionCount },
    'geo.seed.completed'
  )

  return { countries: countryCount, regions: regionCount }
}
