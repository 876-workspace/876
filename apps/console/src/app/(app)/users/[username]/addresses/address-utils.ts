import type {
  AdminAddress,
  AdminAddressCreateParams,
  AdminAddressUpdateParams,
} from '@876/admin'
import type {
  AddressCreateDraft,
  AddressType,
  AddressUpdateDraft,
} from '@/types/user-addresses'
import { addressTypeSchema, addressTypeValues } from '@/types/user-addresses'

export function createEmptyAddressDraft(): AddressCreateDraft {
  return {
    type: 'billing',
    label: '',
    line1: '',
    line2: '',
    city: '',
    countryCode: '',
    postalCode: '',
    isDefault: false,
  }
}

export function createEmptyAddressUpdateDraft(): AddressUpdateDraft {
  return {
    type: 'billing',
    label: '',
    line1: '',
    line2: '',
    city: '',
    country_code: '',
    postal_code: '',
    is_default: false,
  }
}

export function createAddressUpdateDraft(
  address: AdminAddress
): AddressUpdateDraft {
  return {
    type: address.type,
    label: address.label ?? '',
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    city: address.city ?? '',
    country_code: address.country_code ?? '',
    postal_code: address.postal_code ?? '',
    is_default: address.is_default,
  }
}

export function toAddressCreateParams(
  draft: AddressCreateDraft
): AdminAddressCreateParams {
  return {
    type: draft.type,
    label: emptyToNull(draft.label),
    line1: emptyToNull(draft.line1),
    line2: emptyToNull(draft.line2),
    city: emptyToNull(draft.city),
    countryCode: emptyToNull(draft.countryCode),
    postalCode: emptyToNull(draft.postalCode),
    isDefault: draft.isDefault,
  }
}

export function toAddressUpdateParams(
  draft: AddressUpdateDraft
): AdminAddressUpdateParams {
  return {
    type: draft.type,
    label: emptyToNull(draft.label),
    line1: emptyToNull(draft.line1),
    line2: emptyToNull(draft.line2),
    city: emptyToNull(draft.city),
    country_code: emptyToNull(draft.country_code),
    postal_code: emptyToNull(draft.postal_code),
    is_default: draft.is_default,
  }
}

export function addressLabel(address: AdminAddress): string {
  return address.label || `${formatAddressType(address.type)} address`
}

export function addressSummary(address: AdminAddress): string {
  return (
    [address.city, address.country_code?.toUpperCase()]
      .filter(Boolean)
      .join(', ') || '-'
  )
}

export function addressPreviewSummary(address: AdminAddress): string {
  return (
    [address.line1, address.city, address.country_code?.toUpperCase()]
      .filter(Boolean)
      .join(', ') || '-'
  )
}

export function formatAddressType(type: AddressType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function isAddressType(value: string | null): value is AddressType {
  return addressTypeSchema.safeParse(value).success
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export { addressTypeValues as ADDRESS_TYPES }
