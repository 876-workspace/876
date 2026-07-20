import { z } from 'zod'

/**
 * Contracts for the Zoho-style customer import (CSV/TSV/XLSX → Billing
 * `Customer`). The row schema is the single source of truth shared by the
 * browser wizard's live preview and the server's authoritative re-validation.
 * Imported customers are always `EXTERNAL` (a party with no 876 account).
 */

/** Upper bound on rows accepted in a single import request. */
export const MAX_IMPORT_ROWS = 2000

/** A customer field a file column can be mapped onto, plus header aliases. */
export type ImportableField = {
  /** Field key on the customer create payload. */
  key:
    | 'name'
    | 'companyName'
    | 'customerKind'
    | 'salutation'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'workPhone'
    | 'currency'
    | 'language'
    | 'externalReference'
  /** Human label shown in the mapping UI. */
  label: string
  /** Whether a column must be mapped to this field to import. */
  required?: boolean
  /** One-line hint shown under the field in the mapping UI. */
  hint?: string
  /** Lowercased header spellings auto-matched to this field. */
  aliases: string[]
}

export const IMPORTABLE_FIELDS: ImportableField[] = [
  {
    key: 'name',
    label: 'Customer Name',
    required: true,
    hint: 'Display name shown across billing. Required.',
    aliases: ['name', 'customer name', 'display name', 'customer', 'full name'],
  },
  {
    key: 'companyName',
    label: 'Company Name',
    aliases: ['company', 'company name', 'organization', 'business name'],
  },
  {
    key: 'customerKind',
    label: 'Type',
    hint: 'Individual or Business. Defaults to Individual.',
    aliases: ['type', 'customer type', 'kind', 'customer kind'],
  },
  {
    key: 'salutation',
    label: 'Salutation',
    aliases: ['salutation', 'title', 'prefix'],
  },
  {
    key: 'firstName',
    label: 'First Name',
    aliases: ['first name', 'firstname', 'given name'],
  },
  {
    key: 'lastName',
    label: 'Last Name',
    aliases: ['last name', 'lastname', 'surname', 'family name'],
  },
  {
    key: 'email',
    label: 'Email',
    hint: 'Used to skip customers you already have.',
    aliases: ['email', 'email address', 'e-mail'],
  },
  {
    key: 'phone',
    label: 'Phone',
    aliases: ['phone', 'mobile', 'mobile phone', 'phone number', 'contact'],
  },
  {
    key: 'workPhone',
    label: 'Work Phone',
    aliases: ['work phone', 'office phone', 'landline'],
  },
  {
    key: 'currency',
    label: 'Currency',
    hint: 'Three-letter code (e.g. JMD). Defaults to the workspace currency.',
    aliases: ['currency', 'currency code'],
  },
  {
    key: 'language',
    label: 'Language',
    aliases: ['language', 'locale'],
  },
  {
    key: 'externalReference',
    label: 'External ID',
    hint: 'A code from your old system. Preferred key for skipping duplicates.',
    aliases: [
      'external id',
      'external reference',
      'reference',
      'customer id',
      'code',
    ],
  },
]

export type ImportableFieldKey = ImportableField['key']

/** Normalized output of parsing an uploaded CSV/TSV/XLSX file. */
export interface ParsedSheet {
  /** Column headers, in file order. */
  headers: string[]
  /** Data rows keyed by header. Every cell is a trimmed string ('' when empty). */
  rows: Record<string, string>[]
}

/** Trims a raw cell and treats an empty cell as absent. */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const importText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().min(1).max(max).optional())

const importEmail = z.preprocess(
  emptyToUndefined,
  z.email().max(320).optional()
)

/** Accepts common spellings for the two customer kinds; defaults to individual. */
const importKind = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value
    const token = value.trim().toUpperCase()
    if (token === '' || token === 'INDIVIDUAL' || token === 'PERSON')
      return 'INDIVIDUAL'
    if (token === 'BUSINESS' || token === 'COMPANY' || token === 'ORGANIZATION')
      return 'BUSINESS'
    return token
  },
  z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL')
)

/**
 * Validates one mapped row of raw string cells. Currency enablement is checked
 * in the service (it is tenant-dependent), not here.
 */
export const CustomerImportRowSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().min(1).max(160)),
  customerKind: importKind,
  salutation: importText(40),
  firstName: importText(80),
  lastName: importText(80),
  companyName: importText(160),
  email: importEmail,
  phone: importText(160),
  workPhone: importText(160),
  currency: z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value.trim().toUpperCase() || undefined
        : value,
    z
      .string()
      .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.')
      .optional()
  ),
  language: importText(12),
  externalReference: importText(160),
})

export type CustomerImportRow = z.infer<typeof CustomerImportRowSchema>

/** One raw, pre-validation row: importable field key → raw string cell. */
export type CustomerImportRawRow = Partial<Record<ImportableFieldKey, string>>

export const CustomerImportRequestSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, 'Add at least one row to import.')
    .max(MAX_IMPORT_ROWS),
})

export type CustomerImportRequest = z.infer<typeof CustomerImportRequestSchema>

export type CustomerImportRowStatus = 'imported' | 'skipped' | 'failed'

/** Per-row outcome, ordered to match the submitted rows. */
export interface CustomerImportRowOutcome {
  /** Zero-based index into the submitted rows. */
  index: number
  /** Best-effort customer name for display (may be empty for failed rows). */
  name: string
  status: CustomerImportRowStatus
  /** Why the row was skipped or failed. Absent for imported rows. */
  reason?: string
}

/** Summary returned by `service.customers.import`. */
export interface CustomerImportResult {
  object: 'customer_import'
  total: number
  imported: number
  skipped: number
  failed: number
  rows: CustomerImportRowOutcome[]
}
