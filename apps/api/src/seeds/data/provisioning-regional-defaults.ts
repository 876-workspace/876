import { PROVISIONING_SETUP_ENTITLEMENT_CATALOG } from '@876/core/types/provisioning-policy'

export type RegionalProvisioningPreset = {
  key: string
  name: string
  description: string
  countryCode: string | null
  currency: {
    code: string
    name: string
    minorUnit: number
  }
  defaultLanguage: 'en'
  isFallback: boolean
  entitlements: Array<{
    targetType: 'application' | 'service'
    targetKey: string
    enabled: boolean
  }>
}

const CURRENCIES = {
  AWG: { code: 'AWG', name: 'Aruban Florin', minorUnit: 2 },
  BBD: { code: 'BBD', name: 'Barbadian Dollar', minorUnit: 2 },
  BMD: { code: 'BMD', name: 'Bermudian Dollar', minorUnit: 2 },
  BSD: { code: 'BSD', name: 'Bahamian Dollar', minorUnit: 2 },
  BZD: { code: 'BZD', name: 'Belize Dollar', minorUnit: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', minorUnit: 2 },
  CUP: { code: 'CUP', name: 'Cuban Peso', minorUnit: 2 },
  DOP: { code: 'DOP', name: 'Dominican Peso', minorUnit: 2 },
  EUR: { code: 'EUR', name: 'Euro', minorUnit: 2 },
  GYD: { code: 'GYD', name: 'Guyanese Dollar', minorUnit: 2 },
  HTG: { code: 'HTG', name: 'Haitian Gourde', minorUnit: 2 },
  JMD: { code: 'JMD', name: 'Jamaican Dollar', minorUnit: 2 },
  KYD: { code: 'KYD', name: 'Cayman Islands Dollar', minorUnit: 2 },
  SRD: { code: 'SRD', name: 'Surinamese Dollar', minorUnit: 2 },
  TTD: { code: 'TTD', name: 'Trinidad and Tobago Dollar', minorUnit: 2 },
  USD: { code: 'USD', name: 'US Dollar', minorUnit: 2 },
  XCD: { code: 'XCD', name: 'East Caribbean Dollar', minorUnit: 2 },
  XCG: { code: 'XCG', name: 'Caribbean Guilder', minorUnit: 2 },
} as const

type CurrencyCode = keyof typeof CURRENCIES

const DEFAULT_ENTITLEMENTS = PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map(
  (entry) => ({
    targetType: entry.target_type,
    targetKey: entry.target_key,
    enabled: entry.default_enabled,
  })
)

function preset(
  key: string,
  name: string,
  countryCode: string,
  currencyCode: CurrencyCode
): RegionalProvisioningPreset {
  return {
    key,
    name,
    description: `${name} day-zero finance defaults. English is the current platform language; tax configuration remains operator-controlled unless explicitly seeded.`,
    countryCode,
    currency: CURRENCIES[currencyCode],
    defaultLanguage: 'en',
    isFallback: false,
    entitlements: DEFAULT_ENTITLEMENTS.map((entry) => ({ ...entry })),
  }
}

/**
 * Phase-1 target presets. Each country gets an independent setup even when two
 * countries share a currency because taxation/jurisdiction policy can diverge
 * later without splitting a live setup.
 */
export const REGIONAL_PROVISIONING_PRESETS: RegionalProvisioningPreset[] = [
  preset('antigua-and-barbuda', 'Antigua and Barbuda', 'AG', 'XCD'),
  preset('bahamas', 'Bahamas', 'BS', 'BSD'),
  preset('barbados', 'Barbados', 'BB', 'BBD'),
  preset('belize', 'Belize', 'BZ', 'BZD'),
  preset('cuba', 'Cuba', 'CU', 'CUP'),
  preset('dominica', 'Dominica', 'DM', 'XCD'),
  preset('dominican-republic', 'Dominican Republic', 'DO', 'DOP'),
  preset('grenada', 'Grenada', 'GD', 'XCD'),
  preset('guyana', 'Guyana', 'GY', 'GYD'),
  preset('haiti', 'Haiti', 'HT', 'HTG'),
  preset('jamaica', 'Jamaica', 'JM', 'JMD'),
  preset('saint-kitts-and-nevis', 'Saint Kitts and Nevis', 'KN', 'XCD'),
  preset('saint-lucia', 'Saint Lucia', 'LC', 'XCD'),
  preset(
    'saint-vincent-and-the-grenadines',
    'Saint Vincent and the Grenadines',
    'VC',
    'XCD'
  ),
  preset('suriname', 'Suriname', 'SR', 'SRD'),
  preset('trinidad-and-tobago', 'Trinidad and Tobago', 'TT', 'TTD'),
  preset('puerto-rico', 'Puerto Rico', 'PR', 'USD'),
  preset('cayman-islands', 'Cayman Islands', 'KY', 'KYD'),
  preset('turks-and-caicos-islands', 'Turks and Caicos Islands', 'TC', 'USD'),
  preset('british-virgin-islands', 'British Virgin Islands', 'VG', 'USD'),
  preset('us-virgin-islands', 'U.S. Virgin Islands', 'VI', 'USD'),
  preset('anguilla', 'Anguilla', 'AI', 'XCD'),
  preset('montserrat', 'Montserrat', 'MS', 'XCD'),
  preset('bermuda', 'Bermuda', 'BM', 'BMD'),
  preset('aruba', 'Aruba', 'AW', 'AWG'),
  preset('curacao', 'Curaçao', 'CW', 'XCG'),
  preset('sint-maarten', 'Sint Maarten', 'SX', 'XCG'),
  preset('caribbean-netherlands', 'Bonaire, Sint Eustatius and Saba', 'BQ', 'USD'),
  preset('guadeloupe', 'Guadeloupe', 'GP', 'EUR'),
  preset('martinique', 'Martinique', 'MQ', 'EUR'),
  preset('saint-barthelemy', 'Saint Barthélemy', 'BL', 'EUR'),
  preset('saint-martin', 'Saint Martin', 'MF', 'EUR'),
  preset('french-guiana', 'French Guiana', 'GF', 'EUR'),
  preset('united-states', 'United States', 'US', 'USD'),
  preset('canada', 'Canada', 'CA', 'CAD'),
]

/**
 * Platform fallback for an organization that does not match a more specific
 * setup. It deliberately has no country condition: USD is a currency fallback,
 * not an assertion that the organization is American.
 */
export const GLOBAL_USD_PROVISIONING_PRESET: RegionalProvisioningPreset = {
  key: 'global-usd',
  name: 'Global USD',
  description:
    'Fallback provisioning for organizations without a more specific location policy. Uses USD and English without assuming a country.',
  countryCode: null,
  currency: CURRENCIES.USD,
  defaultLanguage: 'en',
  isFallback: true,
  entitlements: DEFAULT_ENTITLEMENTS.map((entry) => ({ ...entry })),
}

export const ALL_REGIONAL_PROVISIONING_PRESETS = [
  ...REGIONAL_PROVISIONING_PRESETS,
  GLOBAL_USD_PROVISIONING_PRESET,
]
