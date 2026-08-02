import type { OrganizationSelfUpdateParams } from '@876/sdk'
import { Building2, ClipboardList, Globe } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

export type FieldKey = keyof OrganizationSelfUpdateParams

export type FieldSpec = {
  key: FieldKey
  label: string
  type?: 'text' | 'email' | 'url' | 'tel'
  placeholder?: string
  /** Uppercase, monospaced short codes (country/currency). */
  code?: boolean
  maxLength?: number
}

export type Section = {
  title: string
  icon: IconComponent
  fields: FieldSpec[]
}

export const SECTIONS: Section[] = [
  {
    title: 'Company identity',
    icon: Building2,
    fields: [
      { key: 'name', label: 'Legal name', placeholder: 'Acme Corp' },
      { key: 'short_name', label: 'Short name', placeholder: 'Acme' },
      { key: 'doing_business_as', label: 'Doing business as' },
      { key: 'industry', label: 'Industry' },
      { key: 'business_type', label: 'Business type' },
    ],
  },
  {
    title: 'Registration & tax',
    icon: ClipboardList,
    fields: [
      { key: 'registration_number', label: 'Registration number' },
      { key: 'trn', label: 'TRN' },
      { key: 'nis_number', label: 'NIS number' },
      { key: 'gct_number', label: 'GCT number' },
      { key: 'tax_id', label: 'Tax ID' },
      {
        key: 'incorporation_date',
        label: 'Incorporation date',
        placeholder: 'YYYY-MM-DD',
      },
    ],
  },
  {
    title: 'Web presence',
    icon: Globe,
    fields: [
      {
        key: 'website_url',
        label: 'Website',
        type: 'url',
        placeholder: 'https://example.com',
      },
      {
        key: 'support_url',
        label: 'Support URL',
        type: 'url',
        placeholder: 'https://support.example.com',
      },
    ],
  },
  {
    title: 'Locale',
    icon: Globe,
    fields: [
      {
        key: 'currency_code',
        label: 'Currency code',
        placeholder: 'JMD',
        code: true,
        maxLength: 3,
      },
      { key: 'timezone', label: 'Timezone', placeholder: 'America/Jamaica' },
      { key: 'language', label: 'Language', placeholder: 'en' },
    ],
  },
]

export const ALL_KEYS: FieldKey[] = SECTIONS.flatMap((section) =>
  section.fields.map((field) => field.key)
)
