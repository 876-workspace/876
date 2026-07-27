import type { ProfileFormValues } from './profile-form'

/** A key of the organization profile form. */
export type FieldKey = keyof ProfileFormValues

export type SelectOption = { value: string; label: string }

/** One editable field: an input, or a select when `options` is present. */
export type FieldSpec = {
  key: FieldKey
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date'
  placeholder?: string
  hint?: string
  required?: boolean
  maxLength?: number
  uppercase?: boolean
  options?: SelectOption[]
}

/**
 * A unit of layout inside a section. `logo` and `address` are composite:
 * a logo uploader, and a group of address fields rendered together.
 */
export type Block =
  | { kind: 'logo' }
  | { kind: 'field'; field: FieldSpec }
  | { kind: 'address'; label: string; fields: FieldSpec[] }

/** Icon key — resolved to a component client-side; icons can't cross RSC. */
export type SectionIcon = 'organization' | 'contact' | 'legal' | 'locale'

export type SectionSpec = {
  id: string
  title: string
  icon: SectionIcon
  blocks: Block[]
}

const BUSINESS_TYPES: SelectOption[] = [
  { value: 'sole_proprietorship', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'non_profit', label: 'Non-profit' },
  { value: 'other', label: 'Other' },
]

/**
 * ISO 4217 currencies, Caribbean-first for the platform's primary market.
 * Labelled with the issuing country's flag, the currency name, then its code.
 */
const CURRENCIES: SelectOption[] = [
  { value: 'JMD', label: '\u{1F1EF}\u{1F1F2}  Jamaican Dollar (JMD)' },
  { value: 'USD', label: '\u{1F1FA}\u{1F1F8}  US Dollar (USD)' },
  { value: 'TTD', label: '\u{1F1F9}\u{1F1F9}  Trinidad & Tobago Dollar (TTD)' },
  { value: 'BBD', label: '\u{1F1E7}\u{1F1E7}  Barbadian Dollar (BBD)' },
  { value: 'BSD', label: '\u{1F1E7}\u{1F1F8}  Bahamian Dollar (BSD)' },
  { value: 'KYD', label: '\u{1F1F0}\u{1F1FE}  Cayman Islands Dollar (KYD)' },
  { value: 'GYD', label: '\u{1F1EC}\u{1F1FE}  Guyanese Dollar (GYD)' },
  { value: 'BZD', label: '\u{1F1E7}\u{1F1FF}  Belize Dollar (BZD)' },
  { value: 'HTG', label: '\u{1F1ED}\u{1F1F9}  Haitian Gourde (HTG)' },
  { value: 'DOP', label: '\u{1F1E9}\u{1F1F4}  Dominican Peso (DOP)' },
  { value: 'XCD', label: '\u{1F30E}  East Caribbean Dollar (XCD)' },
  { value: 'CAD', label: '\u{1F1E8}\u{1F1E6}  Canadian Dollar (CAD)' },
  { value: 'GBP', label: '\u{1F1EC}\u{1F1E7}  Pound Sterling (GBP)' },
  { value: 'EUR', label: '\u{1F1EA}\u{1F1FA}  Euro (EUR)' },
  { value: 'MXN', label: '\u{1F1F2}\u{1F1FD}  Mexican Peso (MXN)' },
  { value: 'AUD', label: '\u{1F1E6}\u{1F1FA}  Australian Dollar (AUD)' },
  { value: 'CNY', label: '\u{1F1E8}\u{1F1F3}  Chinese Yuan (CNY)' },
  { value: 'INR', label: '\u{1F1EE}\u{1F1F3}  Indian Rupee (INR)' },
]

/**
 * Builds the section/field model the form renders from. Parishes come from
 * the geo service at request time, so the model is a function.
 */
export function buildSections(parishes: SelectOption[]): SectionSpec[] {
  return [
    {
      id: 'organization',
      title: 'Profile',
      icon: 'organization',
      blocks: [
        { kind: 'logo' },
        {
          kind: 'field',
          field: { key: 'name', label: 'Organization name', required: true },
        },
        {
          kind: 'field',
          field: {
            key: 'doing_business_as',
            label: 'Trading name (DBA)',
            hint: 'If different from the registered name.',
          },
        },
        {
          kind: 'field',
          field: {
            key: 'business_type',
            label: 'Business type',
            placeholder: 'Select business type',
            options: BUSINESS_TYPES,
          },
        },
        {
          kind: 'field',
          field: {
            key: 'industry',
            label: 'Industry',
            placeholder: 'e.g. Logistics and delivery',
          },
        },
        {
          kind: 'address',
          label: 'Organization address',
          fields: [
            {
              key: 'address_line1',
              label: 'Street address',
              placeholder: 'Street address',
            },
            {
              key: 'address_line2',
              label: 'Apartment, suite, unit',
              placeholder: 'Apartment, suite, unit',
            },
            { key: 'city', label: 'City or town', placeholder: 'City or town' },
            {
              key: 'region_id',
              label: 'Parish',
              placeholder: 'Select parish',
              options: parishes,
            },
            {
              key: 'country_code',
              label: 'Country',
              placeholder: 'JM',
              maxLength: 2,
              uppercase: true,
              hint: 'Two-letter country code.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      icon: 'contact',
      blocks: [
        {
          kind: 'field',
          field: { key: 'primary_phone', label: 'Phone', type: 'tel' },
        },
        {
          kind: 'field',
          field: { key: 'primary_email', label: 'Email', type: 'email' },
        },
        {
          kind: 'field',
          field: {
            key: 'website_url',
            label: 'Website',
            type: 'url',
            placeholder: 'https://',
          },
        },
        { kind: 'field', field: { key: 'fax', label: 'Fax' } },
      ],
    },
    {
      id: 'tax',
      title: 'Legal info',
      icon: 'legal',
      blocks: [
        {
          kind: 'field',
          field: {
            key: 'registration_number',
            label: 'Company registration number',
          },
        },
        {
          kind: 'field',
          field: {
            key: 'incorporation_date',
            label: 'Incorporation date',
            type: 'date',
          },
        },
        {
          kind: 'field',
          field: {
            key: 'trn',
            label: 'TRN',
            hint: 'Taxpayer Registration Number (Jamaica).',
          },
        },
        { kind: 'field', field: { key: 'gct_number', label: 'GCT number' } },
        { kind: 'field', field: { key: 'nis_number', label: 'NIS number' } },
        {
          kind: 'field',
          field: {
            key: 'tax_id',
            label: 'Tax ID',
            hint: 'For organizations registered outside Jamaica.',
          },
        },
      ],
    },
    {
      id: 'locale',
      title: 'Locale',
      icon: 'locale',
      blocks: [
        {
          kind: 'field',
          field: {
            key: 'currency_code',
            label: 'Base currency',
            placeholder: 'Select currency',
            options: CURRENCIES,
            hint: 'Used for invoices and financial reports.',
          },
        },
        {
          kind: 'field',
          field: {
            key: 'timezone',
            label: 'Time zone',
            placeholder: 'America/Jamaica',
          },
        },
        {
          kind: 'field',
          field: { key: 'language', label: 'Language', placeholder: 'en-JM' },
        },
      ],
    },
  ]
}
