export function formatAddressLocality(address: {
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string | null
}) {
  return [address.city, address.state, address.postalCode, address.countryCode]
    .filter(Boolean)
    .join(', ')
}

export function countryName(countryCode: string) {
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ??
      countryCode
    )
  } catch {
    return countryCode
  }
}

export function invoiceAddressSnapshot(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const read = (key: string) =>
    typeof record[key] === 'string' ? record[key] : null

  return {
    attention: read('attention'),
    line1: read('line1'),
    line2: read('line2'),
    city: read('city'),
    state: read('state'),
    postalCode: read('postalCode'),
    countryCode: read('countryCode'),
  }
}
