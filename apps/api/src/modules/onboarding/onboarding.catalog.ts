/**
 * The onboarding field catalog and its validator.
 *
 * Ported from `services/onboarding_catalog.py`. Pure — no I/O, no database —
 * which is what makes it testable rule by rule and keeps a query off the
 * onboarding path.
 *
 * The catalog is versioned by `CATALOG_REVISION`. A saved session records the
 * revision it was answered against and is re-validated against **that** revision
 * at submit, so changing the catalog cannot retroactively invalidate answers
 * someone already gave.
 */

import type {
  JsonValue,
  OnboardingCatalog,
  OnboardingFieldDefinition,
  OnboardingFieldType,
  OnboardingTargetType,
  OnboardingValidationIssue,
} from './onboarding.schemas'

export const CATALOG_REVISION = 1

/** A field as declared in this file — the wire shape is built from it. */
type FieldSpec = {
  key: string
  label: string
  fieldType?: OnboardingFieldType
  description?: string
  required?: boolean
  sensitive?: boolean
  placeholder?: string
  pattern?: string
  minItems?: number
  requiredWhenKey?: string
  requiredWhenValue?: JsonValue
  options?: readonly (readonly [string, string])[]
  itemFields?: readonly FieldSpec[]
}

type SectionSpec = {
  key: string
  title: string
  description: string
  fields: readonly FieldSpec[]
}

const ENTITY_TYPES = [
  ['limited_company', 'Limited-liability organization'],
  ['partnership', 'Partnership'],
  ['sole_proprietorship', 'Sole proprietor'],
  ['non_profit', 'Non-profit organization'],
  ['trust', 'Trust'],
  ['statutory_body', 'Statutory body'],
  ['government', 'Government entity'],
  ['overseas_company', 'Overseas organization'],
  ['other', 'Other'],
] as const

const EMPLOYEE_COUNT_RANGE_OPTIONS = [
  ['1', '1'],
  ['2-10', '2–10'],
  ['11-50', '11–50'],
  ['51-200', '51–200'],
  ['201+', '201+'],
] as const

const TRN_PATTERN = String.raw`^\d{3}-?\d{3}-?\d{3}$`

const CORE_ORGANIZATION_SECTIONS: readonly SectionSpec[] = [
  {
    key: 'business_profile',
    title: 'Business profile',
    description:
      'Basic details used to tailor 876 products for the organization.',
    fields: [
      {
        key: 'business_category',
        label: 'Business category',
        fieldType: 'select',
        required: true,
        options: [
          ['retail', 'Retail'],
          ['food_service', 'Food service'],
          ['logistics', 'Logistics and delivery'],
          ['professional_services', 'Professional services'],
          ['health', 'Health and wellness'],
          ['education', 'Education'],
          ['technology', 'Technology'],
          ['manufacturing', 'Manufacturing'],
          ['construction', 'Construction'],
          ['finance', 'Financial services'],
          ['tourism', 'Tourism and hospitality'],
          ['agriculture', 'Agriculture'],
          ['other', 'Other'],
        ],
      },
      {
        key: 'employee_count_range',
        label: 'Number of employees',
        fieldType: 'select',
        options: EMPLOYEE_COUNT_RANGE_OPTIONS,
      },
    ],
  },
]

const COURIERS_APPLICATION_SECTIONS: readonly SectionSpec[] = [
  {
    key: 'workspace',
    title: 'Workspace setup',
    description: "Details used to create the organization's courier workspace.",
    fields: [
      {
        key: 'platform_name',
        label: 'Platform name',
        required: true,
        placeholder: 'Rocket Express',
        description: 'Shown to your customers across the courier platform.',
      },
      {
        key: 'mailbox_prefix',
        label: 'Mailbox prefix',
        placeholder: 'RE',
        description: 'Optional code shown before every mailbox number.',
        pattern: String.raw`^[A-Za-z0-9]{1,6}$`,
      },
    ],
  },
]

const APPLICATION_CATALOGS: Readonly<Record<string, readonly SectionSpec[]>> = {
  '876-couriers': COURIERS_APPLICATION_SECTIONS,
}

const JM_ORGANIZATION_SECTIONS: readonly SectionSpec[] = [
  {
    key: 'identity',
    title: 'Legal identity',
    description: 'The registered identity and legal form of the organization.',
    fields: [
      { key: 'legal_name', label: 'Registered legal name', required: true },
      { key: 'trade_name', label: 'Trade or business name' },
      {
        key: 'entity_type',
        label: 'Type of organization',
        fieldType: 'select',
        required: true,
        options: ENTITY_TYPES,
      },
      {
        key: 'company_type',
        label: 'Organization type',
        fieldType: 'select',
        options: [
          ['private', 'Private'],
          ['public', 'Public'],
        ],
      },
      {
        key: 'country_of_incorporation',
        label: 'Country of incorporation',
        required: true,
        placeholder: 'JM',
      },
      {
        key: 'incorporation_date',
        label: 'Date of incorporation or registration',
        fieldType: 'date',
      },
    ],
  },
  {
    key: 'registrations',
    title: 'Government registrations',
    description:
      'Identifiers issued through the Companies Office, TAJ, NIS, NHT, and HEART/NSTA Trust.',
    fields: [
      {
        key: 'coj_registration_number',
        label: 'Companies Office registration number',
        required: true,
      },
      {
        key: 'trn',
        label: 'Taxpayer Registration Number (TRN)',
        required: true,
        sensitive: true,
        placeholder: '000-000-000',
        pattern: TRN_PATTERN,
      },
      { key: 'income_tax_number', label: 'Income tax number', sensitive: true },
      { key: 'nis_number', label: 'NIS employer number', sensitive: true },
      {
        key: 'gct_registered',
        label: 'Registered for GCT',
        fieldType: 'boolean',
      },
      {
        key: 'gct_number',
        label: 'GCT registration number',
        sensitive: true,
        requiredWhenKey: 'gct_registered',
        requiredWhenValue: true,
      },
      {
        key: 'nht_employer_number',
        label: 'NHT employer number',
        sensitive: true,
      },
      {
        key: 'heart_employer_number',
        label: 'HEART/NSTA employer number',
        sensitive: true,
      },
      {
        key: 'tcc_number',
        label: 'Tax Compliance Certificate number',
        sensitive: true,
      },
      { key: 'tcc_expiry_date', label: 'TCC expiry date', fieldType: 'date' },
    ],
  },
  {
    key: 'registered_office',
    title: 'Registered office',
    description:
      'The Jamaican registered office and mailing address recorded for the organization.',
    fields: [
      {
        key: 'registered_address_line1',
        label: 'Street address',
        required: true,
      },
      { key: 'registered_address_line2', label: 'Address line 2' },
      { key: 'registered_city', label: 'Town or city', required: true },
      { key: 'registered_parish', label: 'Parish', required: true },
      { key: 'registered_postal_code', label: 'Postal zone' },
      { key: 'mailing_address', label: 'Mailing address', fieldType: 'text' },
    ],
  },
  {
    key: 'contact',
    title: 'Business contact',
    description:
      'Primary organization contact information used across 876 products.',
    fields: [
      {
        key: 'primary_phone',
        label: 'Telephone number',
        fieldType: 'phone',
        required: true,
      },
      {
        key: 'primary_email',
        label: 'Email address',
        fieldType: 'email',
        required: true,
      },
      { key: 'website_url', label: 'Website', fieldType: 'url' },
      {
        key: 'primary_contact_name',
        label: 'Primary contact name',
        required: true,
      },
      { key: 'primary_contact_title', label: 'Primary contact title' },
    ],
  },
  {
    key: 'operations',
    title: 'Operations and tax profile',
    description:
      'Information used to configure reporting periods, payroll readiness, and relevant product defaults.',
    fields: [
      {
        key: 'nature_of_business',
        label: 'Nature of business',
        fieldType: 'text',
        required: true,
      },
      { key: 'industry', label: 'Industry', required: true },
      {
        key: 'business_start_date',
        label: 'Business start date',
        fieldType: 'date',
      },
      {
        key: 'accounting_year_end',
        label: 'Accounting year end',
        fieldType: 'date',
      },
      {
        key: 'first_employee_date',
        label: 'Date first employee started',
        fieldType: 'date',
      },
      { key: 'usual_tax_collectorate', label: 'Usual tax collectorate' },
      {
        key: 'employee_count_range',
        label: 'Number of employees',
        fieldType: 'select',
        options: EMPLOYEE_COUNT_RANGE_OPTIONS,
      },
    ],
  },
  {
    key: 'leadership',
    title: 'Directors, officers, and beneficial owners',
    description:
      'Repeatable legal-party records required for Jamaican organization administration.',
    fields: [
      {
        key: 'directors',
        label: 'Directors or senior officers',
        fieldType: 'collection',
        required: true,
        sensitive: true,
        minItems: 1,
        itemFields: [
          { key: 'first_name', label: 'First name', required: true },
          { key: 'last_name', label: 'Last name', required: true },
          { key: 'title', label: 'Office or title', required: true },
          {
            key: 'individual_trn',
            label: 'Individual TRN',
            sensitive: true,
            pattern: TRN_PATTERN,
          },
          {
            key: 'responsibility_start_date',
            label: 'Responsibility commenced',
            fieldType: 'date',
          },
        ],
      },
      {
        key: 'beneficial_owners',
        label: 'Beneficial owners',
        fieldType: 'collection',
        required: true,
        sensitive: true,
        minItems: 1,
        itemFields: [
          { key: 'first_name', label: 'First name', required: true },
          { key: 'last_name', label: 'Last name', required: true },
          {
            key: 'date_of_birth',
            label: 'Date of birth',
            fieldType: 'date',
            sensitive: true,
          },
          { key: 'nationality', label: 'Nationality', required: true },
          { key: 'occupation', label: 'Occupation' },
          {
            key: 'address',
            label: 'Residential address',
            fieldType: 'text',
            required: true,
            sensitive: true,
          },
          {
            key: 'identification_type',
            label: 'Identification type',
            fieldType: 'select',
            required: true,
            sensitive: true,
            options: [
              ['trn', 'TRN'],
              ['voter_id', 'Voter ID'],
              ['passport', 'Passport'],
              ['drivers_licence', 'Driver’s licence'],
            ],
          },
          {
            key: 'identification_number',
            label: 'Identification number',
            required: true,
            sensitive: true,
          },
          {
            key: 'ownership_or_control',
            label: 'Ownership or control basis',
            fieldType: 'multiselect',
            required: true,
            options: [
              ['owns_25_50', 'Owns 25–50%'],
              ['owns_51_75', 'Owns 51–75%'],
              ['owns_76_100', 'Owns 76–100%'],
              ['policy_control', 'Determines organization policy'],
              ['director_control', 'Appoints or removes directors'],
              ['management_control', 'Controls management'],
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'locations',
    title: 'Branches and operating locations',
    description:
      'Every office, branch, store, warehouse, or other operating site that products may use.',
    fields: [
      {
        key: 'locations',
        label: 'Locations',
        fieldType: 'collection',
        required: true,
        minItems: 1,
        itemFields: [
          { key: 'name', label: 'Location name', required: true },
          { key: 'code', label: 'Internal code' },
          {
            key: 'type',
            label: 'Location type',
            fieldType: 'select',
            required: true,
            options: [
              ['headquarters', 'Headquarters'],
              ['branch', 'Branch'],
              ['office', 'Office'],
              ['store', 'Store'],
              ['warehouse', 'Warehouse'],
              ['remote', 'Remote'],
              ['other', 'Other'],
            ],
          },
          {
            key: 'is_primary',
            label: 'Primary location',
            fieldType: 'boolean',
          },
          { key: 'line1', label: 'Street address', required: true },
          { key: 'line2', label: 'Address line 2' },
          { key: 'city', label: 'Town or city', required: true },
          { key: 'parish', label: 'Parish', required: true },
          { key: 'postal_code', label: 'Postal zone' },
          { key: 'phone', label: 'Telephone', fieldType: 'phone' },
          { key: 'email', label: 'Email', fieldType: 'email' },
        ],
      },
    ],
  },
  {
    key: 'survey',
    title: 'Product onboarding survey',
    description:
      'Non-legal context used to tailor app onboarding without blocking account creation.',
    fields: [
      {
        key: 'implementation_goal',
        label: 'What should 876 help you accomplish first?',
        fieldType: 'text',
      },
      {
        key: 'products_of_interest',
        label: 'Products of interest',
        fieldType: 'multiselect',
        options: [
          ['billing', '876 Billing'],
          ['couriers', '876 Couriers'],
        ],
      },
      {
        key: 'expected_monthly_transactions',
        label: 'Expected monthly transactions',
        fieldType: 'integer',
      },
      { key: 'migration_source', label: 'System you are migrating from' },
    ],
  },
]

const JM_ORGANIZATION_CATALOG_REVISIONS: Readonly<
  Record<number, readonly SectionSpec[]>
> = {
  1: JM_ORGANIZATION_SECTIONS,
}

/** Raised when no catalog matches the requested target; the caller answers 404. */
export class UnknownCatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnknownCatalogError'
  }
}

function serializeField(field: FieldSpec): OnboardingFieldDefinition {
  return {
    key: field.key,
    label: field.label,
    description: field.description ?? null,
    field_type: field.fieldType ?? 'string',
    required: field.required ?? false,
    sensitive: field.sensitive ?? false,
    placeholder: field.placeholder ?? null,
    pattern: field.pattern ?? null,
    min_items: field.minItems ?? null,
    required_when:
      field.requiredWhenKey !== undefined
        ? {
            field_key: field.requiredWhenKey,
            equals: field.requiredWhenValue ?? null,
          }
        : null,
    options: (field.options ?? []).map(([value, label]) => ({ value, label })),
    item_fields: (field.itemFields ?? []).map(serializeField),
  }
}

function buildCatalog(
  targetType: OnboardingTargetType,
  targetKey: string,
  countryCode: string,
  revision: number,
  sections: readonly SectionSpec[]
): OnboardingCatalog {
  return {
    object: 'onboarding_catalog',
    target_type: targetType,
    target_key: targetKey,
    country_code: countryCode,
    schema_version: 1,
    catalog_revision: revision,
    sections: sections.map((section, position) => ({
      key: section.key,
      title: section.title,
      description: section.description,
      position,
      fields: section.fields.map(serializeField),
    })),
  }
}

/**
 * The full legal-identity catalog for an organization.
 *
 * Only Jamaica is registered. A second country is a new revision table, not a
 * change to this one.
 */
export function organizationCatalog(
  countryCode: string,
  catalogRevision?: number | null
): OnboardingCatalog {
  const normalized = countryCode.toUpperCase()
  if (normalized !== 'JM')
    throw new UnknownCatalogError(
      `No organization onboarding catalog is registered for ${normalized}.`
    )

  const revision = catalogRevision ?? CATALOG_REVISION
  const sections = JM_ORGANIZATION_CATALOG_REVISIONS[revision]
  if (!sections)
    throw new UnknownCatalogError(
      `No organization onboarding catalog revision ${revision} is registered for ${normalized}.`
    )

  return buildCatalog('organization', 'global', normalized, revision, sections)
}

/** The catalog for any target, or {@link UnknownCatalogError} when none matches. */
export function onboardingCatalog(
  targetType: OnboardingTargetType,
  targetKey: string,
  countryCode: string,
  catalogRevision?: number | null
): OnboardingCatalog {
  if (targetType === 'organization' && targetKey === 'global')
    return organizationCatalog(countryCode, catalogRevision)

  let sections: readonly SectionSpec[] | undefined
  if (targetType === 'organization' && targetKey === 'core') {
    sections = CORE_ORGANIZATION_SECTIONS
  } else if (targetType === 'application') {
    sections = APPLICATION_CATALOGS[targetKey]
    if (!sections)
      throw new UnknownCatalogError(
        `No onboarding catalog is registered for application/${targetKey}.`
      )
  } else {
    throw new UnknownCatalogError(
      `No onboarding catalog is registered for ${targetType}/${targetKey}.`
    )
  }

  const normalized = countryCode.toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalized))
    throw new UnknownCatalogError('Country code must be a two-letter code.')

  const revision = catalogRevision ?? CATALOG_REVISION
  if (revision !== 1)
    throw new UnknownCatalogError(
      `No onboarding catalog revision ${revision} is registered for ${targetType}/${targetKey}.`
    )

  return buildCatalog(targetType, targetKey, normalized, revision, sections)
}

// --- validation ---

/** Absent, blank, or an empty container — all read as "not answered". */
function isMissing(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0

  return false
}

function issue(
  path: string,
  code: string,
  message: string
): OnboardingValidationIssue {
  return { path, code, message }
}

function validateField(
  field: OnboardingFieldDefinition,
  value: JsonValue | undefined,
  path: string
): OnboardingValidationIssue[] {
  const issues: OnboardingValidationIssue[] = []

  if (isMissing(value)) {
    if (field.required)
      issues.push(issue(path, 'required', `${field.label} is required.`))
    return issues
  }

  const type = field.field_type
  if (type === 'boolean' && typeof value !== 'boolean') {
    issues.push(
      issue(path, 'invalid_type', `${field.label} must be true or false.`)
    )
  } else if (
    type === 'integer' &&
    (typeof value !== 'number' || !Number.isInteger(value))
  ) {
    // A boolean is not an integer here, which JS gets right for free where
    // Python needed an explicit `isinstance(value, bool)` guard.
    issues.push(
      issue(path, 'invalid_type', `${field.label} must be a whole number.`)
    )
  } else if (
    (type === 'multiselect' || type === 'collection') &&
    !Array.isArray(value)
  ) {
    issues.push(issue(path, 'invalid_type', `${field.label} must be a list.`))
  } else if (
    type !== 'boolean' &&
    type !== 'integer' &&
    type !== 'multiselect' &&
    type !== 'collection' &&
    typeof value !== 'string'
  ) {
    issues.push(issue(path, 'invalid_type', `${field.label} must be text.`))
  }

  if (
    field.pattern &&
    typeof value === 'string' &&
    !new RegExp(`^(?:${field.pattern})$`, 'u').test(value)
  ) {
    issues.push(
      issue(path, 'invalid_format', `${field.label} has an invalid format.`)
    )
  }

  const allowed = new Set(field.options.map((option) => option.value))

  if (
    type === 'select' &&
    typeof value === 'string' &&
    allowed.size > 0 &&
    !allowed.has(value)
  ) {
    issues.push(
      issue(
        path,
        'invalid_option',
        `${field.label} contains an unsupported option.`
      )
    )
  }

  if (type === 'multiselect' && Array.isArray(value)) {
    const invalid = value.some(
      (item) => typeof item !== 'string' || !allowed.has(item)
    )
    if (invalid)
      issues.push(
        issue(
          path,
          'invalid_option',
          `${field.label} contains an unsupported option.`
        )
      )
  }

  if (type === 'collection' && Array.isArray(value)) {
    if (field.min_items !== null && value.length < field.min_items) {
      issues.push(
        issue(
          path,
          'minimum_items',
          `${field.label} requires at least ${field.min_items} item(s).`
        )
      )
    }

    value.forEach((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        issues.push(
          issue(
            `${path}.${index}`,
            'invalid_type',
            'Collection items must be objects.'
          )
        )
        return
      }

      const record = item as Record<string, JsonValue>
      for (const itemField of field.item_fields) {
        issues.push(
          ...validateField(
            itemField,
            record[itemField.key],
            `${path}.${index}.${itemField.key}`
          )
        )
      }

      const known = new Set(field.item_fields.map((f) => f.key))
      for (const unknown of Object.keys(record)) {
        if (!known.has(unknown))
          issues.push(
            issue(
              `${path}.${index}.${unknown}`,
              'unknown_field',
              `Unknown field '${unknown}'.`
            )
          )
      }
    })
  }

  return issues
}

/**
 * Check a full answer set against a catalog.
 *
 * A conditionally required field (`gct_number` when `gct_registered` is true)
 * is promoted to required before it is checked, so the requirement is evaluated
 * against the answers actually given rather than the catalog's static flag.
 */
export function validateOnboardingAnswers(
  catalog: OnboardingCatalog,
  answers: Record<string, JsonValue>
): OnboardingValidationIssue[] {
  const issues: OnboardingValidationIssue[] = []

  const fields = new Map<string, OnboardingFieldDefinition>()
  for (const section of catalog.sections) {
    for (const field of section.fields) fields.set(field.key, field)
  }

  for (const [key, field] of fields) {
    const condition = field.required_when
    const required =
      field.required ||
      (condition !== null && answers[condition.field_key] === condition.equals)

    issues.push(
      ...validateField({ ...field, required }, answers[key], `answers.${key}`)
    )
  }

  for (const unknown of Object.keys(answers)) {
    if (!fields.has(unknown))
      issues.push(
        issue(
          `answers.${unknown}`,
          'unknown_field',
          `Unknown field '${unknown}'.`
        )
      )
  }

  return issues
}
