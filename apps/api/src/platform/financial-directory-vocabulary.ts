/**
 * Controlled vocabulary for financial-directory reference data.
 *
 * Two writers care about these values: the versioned catalog validator in
 * `src/seeds/financial-directory.ts` persists them, and the directory API
 * schemas in `src/modules/directory/financial.schemas.ts` validate them on
 * admin writes and serialize them. A copy in either place would let the seed
 * store a value the API refuses to accept, so the lists live here — the one
 * leaf both sides may import.
 */

export const INSTITUTION_TYPES = [
  'commercial_bank',
  'building_society',
  'merchant_bank',
] as const

export type InstitutionType = (typeof INSTITUTION_TYPES)[number]

export const BANK_BRANCH_TYPES = [
  'full_service',
  'corporate',
  'digital',
  'sales_centre',
  'other',
] as const

export type BankBranchType = (typeof BANK_BRANCH_TYPES)[number]

export const CREDIT_UNION_BRANCH_TYPES = [
  'full_service',
  'head_office',
  'service_centre',
  'other',
] as const

export type CreditUnionBranchType = (typeof CREDIT_UNION_BRANCH_TYPES)[number]

/**
 * Null is "not verified yet", never "assumed active". A routing row created
 * before enrichment has no status rather than a fabricated one.
 */
export const LOCATION_STATUSES = [
  'active',
  'temporarily_closed',
  'permanently_closed',
  'former',
] as const

export type LocationStatus = (typeof LOCATION_STATUSES)[number]

export function isOneOf<T extends string>(
  values: readonly T[],
  value: string
): value is T {
  return (values as readonly string[]).includes(value)
}
