export type PlatformCountry = {
  object: 'country'
  code: string
  name: string
  phone_prefix: string | null
  default_currency_code: string | null
}

export type PlatformRegion = {
  object: 'region'
  id: string
  code: string
  name: string
  type: string
}
