/**
 * OpenAPI prose for the Geo module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_CURRENCIES_SUMMARY = 'List enabled currencies'

export const LIST_CURRENCIES_DESCRIPTION =
  'Returns all enabled currencies sorted by code.'

export const LIST_CURRENCIES_RESPONSES = {
  200: { description: 'Currencies returned.' },
} as const

export const LIST_COUNTRIES_SUMMARY = 'List enabled countries'

export const LIST_COUNTRIES_DESCRIPTION =
  'Returns all enabled countries sorted by name.'

export const LIST_COUNTRIES_RESPONSES = {
  200: { description: 'Countries returned.' },
} as const

export const LIST_REGIONS_SUMMARY = 'List regions for a country'

export const LIST_REGIONS_DESCRIPTION =
  'Returns enabled regions (parishes, states, etc.) for the given country code.'

export const LIST_REGIONS_RESPONSES = {
  200: { description: 'Regions returned.' },
  404: { description: 'Country not found.' },
} as const
