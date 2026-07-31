import type { AddressView } from '@/types/address'

type FormattableAddress = Pick<
  AddressView,
  'line1' | 'line2' | 'city' | 'regionName' | 'regionCode' | 'postalCode'
>

/**
 * Formats an address as a single line.
 *
 * Prefers the stored region display name and falls back to the canonical code,
 * so a row migrated from the legacy postal columns — which has a name but no
 * code — still renders its region.
 */
export function formatAddressLine(address: FormattableAddress): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.regionName ?? address.regionCode,
    address.postalCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * True when an address carries a region snapshot with no canonical code — a row
 * migrated from the legacy columns whose region was never reconciled. Such rows
 * read fine but must pick a canonical region the next time they are edited.
 */
export function needsRegionReview(
  address: Pick<AddressView, 'regionCode' | 'regionName'>
): boolean {
  return address.regionCode === null && address.regionName !== null
}
