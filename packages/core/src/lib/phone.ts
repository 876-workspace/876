import countries from '../countries.json'

type Country = {
  areaCode: string
  countryCode: string
}

type CountryDialCode = Omit<Country, 'areaCode'> & {
  areaCode: string | null
  dialCode: string
  dialDigits: string
}

/** A normalized phone number split into its country and national components. */
export type ParsedPhone = {
  areaCode: string | null
  countryCode: string | null
  dialCode: string
  e164: string
  nationalNumber: string
}

const countryData = countries as Country[]
const countryDialCodes = countryData
  .map((country) => {
    const [dialCode, areaCode = null] = country.areaCode.split('-')

    return {
      ...country,
      areaCode,
      dialCode,
      dialDigits: dialCode.replace(/\D/g, ''),
    }
  })
  .sort((left, right) => {
    const leftLength = left.dialDigits.length + (left.areaCode?.length ?? 0)
    const rightLength = right.dialDigits.length + (right.areaCode?.length ?? 0)

    return rightLength - leftLength
  })
const nanpDialCode = countryDialCodes.find(
  (country) => country.areaCode !== null
)?.dialCode

function isPhoneDigits(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')
}

function findCountryByCode(
  countryCode: string | undefined
): CountryDialCode | null {
  if (typeof countryCode !== 'string') return null

  const normalizedCountryCode = countryCode.trim().toUpperCase()

  return (
    countryDialCodes.find(
      (country) => country.countryCode === normalizedCountryCode
    ) ?? null
  )
}

function findCountryByNanpArea(areaCode: string): CountryDialCode | null {
  if (!nanpDialCode) return null

  return (
    countryDialCodes.find(
      (country) =>
        country.dialCode === nanpDialCode && country.areaCode === areaCode
    ) ?? null
  )
}

function findCountryByDialCode(dialCode: string): CountryDialCode | null {
  const matchingCountries = countryDialCodes.filter(
    (country) => country.dialCode === dialCode && country.areaCode === null
  )

  return matchingCountries.length === 1 ? matchingCountries[0] : null
}

function findDialCode(digits: string): CountryDialCode | null {
  return (
    countryDialCodes.find((country) => {
      const areaDigits = country.areaCode ?? ''

      return digits.startsWith(`${country.dialDigits}${areaDigits}`)
    }) ?? null
  )
}

function parseNanp(digits: string): ParsedPhone | null {
  if (!nanpDialCode || digits.length !== 11) return null

  const dialDigits = nanpDialCode.replace(/\D/g, '')
  if (!digits.startsWith(dialDigits)) return null

  const areaCode = digits.slice(dialDigits.length, dialDigits.length + 3)
  const nationalNumber = digits.slice(dialDigits.length + 3)
  if (nationalNumber.length !== 7) return null

  const country = findCountryByNanpArea(areaCode)

  return {
    areaCode,
    countryCode: country?.countryCode ?? null,
    dialCode: nanpDialCode,
    e164: `+${digits}`,
    nationalNumber,
  }
}

function parseKnownInternational(digits: string): ParsedPhone | null {
  const country = findDialCode(digits)
  if (!country) return null

  if (country.dialCode === nanpDialCode) return parseNanp(digits)

  const nationalNumber = digits.slice(country.dialDigits.length)
  if (!nationalNumber) return null

  const resolvedCountry = findCountryByDialCode(country.dialCode)

  return {
    areaCode: null,
    countryCode: resolvedCountry?.countryCode ?? null,
    dialCode: country.dialCode,
    e164: `+${digits}`,
    nationalNumber,
  }
}

function parseUnknownInternational(digits: string): ParsedPhone | null {
  if (!isPhoneDigits(digits)) return null

  if (nanpDialCode && digits.startsWith(nanpDialCode.slice(1)))
    return parseNanp(digits)

  const dialDigitsLength = Math.min(3, digits.length - 1)
  const dialCode = `+${digits.slice(0, dialDigitsLength)}`
  const nationalNumber = digits.slice(dialDigitsLength)
  if (!nationalNumber) return null

  return {
    areaCode: null,
    countryCode: null,
    dialCode,
    e164: `+${digits}`,
    nationalNumber,
  }
}

function parseDefaultNational(
  digits: string,
  country: CountryDialCode
): ParsedPhone | null {
  if (country.dialCode === nanpDialCode) {
    const nationalDigits =
      digits.length === 7 && country.areaCode
        ? `${country.areaCode}${digits}`
        : digits

    return parseNanp(`${country.dialDigits}${nationalDigits}`)
  }

  const internationalDigits = `${country.dialDigits}${digits}`
  if (!isPhoneDigits(internationalDigits)) return null

  return {
    areaCode: null,
    countryCode: country.countryCode,
    dialCode: country.dialCode,
    e164: `+${internationalDigits}`,
    nationalNumber: digits,
  }
}

function formatNationalNumber(
  nationalNumber: string,
  dialCode: string
): string {
  if (nationalNumber.length <= 7) return nationalNumber

  if (nationalNumber.length === 8) {
    const firstGroupLength = dialCode.length === 3 ? 1 : 4

    return `${nationalNumber.slice(0, firstGroupLength)} ${nationalNumber.slice(firstGroupLength)}`
  }

  if (nationalNumber.length === 9)
    return `${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`

  if (nationalNumber.length === 10)
    return `${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`

  return nationalNumber
}

/**
 * Parses a phone number into E.164-compatible parts. Bare national numbers
 * require a default ISO-2 country code.
 */
export function parsePhone(
  input: string,
  defaultCountryCode?: string
): ParsedPhone | null {
  if (typeof input !== 'string') return null

  const value = input.trim()
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return null

  const digits = value.replace(/\D/g, '')
  if (!isPhoneDigits(digits)) return null

  const knownPhone = parseKnownInternational(digits)
  if (knownPhone) return knownPhone

  const defaultCountry = findCountryByCode(defaultCountryCode)
  if (defaultCountry && !value.startsWith('+'))
    return parseDefaultNational(digits, defaultCountry)

  if (value.startsWith('+') || digits.length >= 11)
    return parseUnknownInternational(digits)

  return null
}

/** Normalizes any input to E.164 digits, such as "+18765555555". */
export function normalizePhone(
  input: string,
  defaultCountryCode?: string
): string | null {
  return parsePhone(input, defaultCountryCode)?.e164 ?? null
}

/** Formats a phone number for display, returning unparseable input unchanged. */
export function formatPhone(
  input: string,
  defaultCountryCode?: string
): string {
  const phone = parsePhone(input, defaultCountryCode)
  if (!phone) return input

  if (phone.areaCode)
    return `${phone.dialCode} (${phone.areaCode}) ${phone.nationalNumber.slice(0, 3)}-${phone.nationalNumber.slice(3)}`

  return `${phone.dialCode} ${formatNationalNumber(phone.nationalNumber, phone.dialCode)}`
}
