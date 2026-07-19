import type { BillingCustomerImportRowResult } from '@876/billing/integration'
import Papa from 'papaparse'

import type { CustomerImportRow } from '@/types/customer-management'

export const IMPORT_TARGETS = [
  { value: 'name', label: 'Name' },
  { value: 'customerKind', label: 'Kind' },
  { value: 'salutation', label: 'Salutation' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'companyName', label: 'Company' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'workPhone', label: 'Work phone' },
  { value: 'customerNumber', label: 'Customer number' },
  { value: 'website', label: 'Website' },
  { value: 'taxRegistrationNumber', label: 'Tax registration number' },
  { value: 'notes', label: 'Notes' },
  { value: 'currency', label: 'Currency' },
  { value: 'language', label: 'Language' },
  { value: 'billingAddress.label', label: 'Billing address label' },
  { value: 'billingAddress.attention', label: 'Billing attention' },
  { value: 'billingAddress.line1', label: 'Billing address line 1' },
  { value: 'billingAddress.line2', label: 'Billing address line 2' },
  { value: 'billingAddress.city', label: 'Billing city' },
  { value: 'billingAddress.state', label: 'Billing state' },
  { value: 'billingAddress.postalCode', label: 'Billing postal code' },
  { value: 'billingAddress.countryCode', label: 'Billing country code' },
  { value: 'shippingAddress.label', label: 'Shipping address label' },
  { value: 'shippingAddress.attention', label: 'Shipping attention' },
  { value: 'shippingAddress.line1', label: 'Shipping address line 1' },
  { value: 'shippingAddress.line2', label: 'Shipping address line 2' },
  { value: 'shippingAddress.city', label: 'Shipping city' },
  { value: 'shippingAddress.state', label: 'Shipping state' },
  { value: 'shippingAddress.postalCode', label: 'Shipping postal code' },
  { value: 'shippingAddress.countryCode', label: 'Shipping country code' },
  { value: 'contact.salutation', label: 'Contact salutation' },
  { value: 'contact.firstName', label: 'Contact first name' },
  { value: 'contact.lastName', label: 'Contact last name' },
  { value: 'contact.email', label: 'Contact email' },
  { value: 'contact.workPhone', label: 'Contact work phone' },
  { value: 'contact.mobilePhone', label: 'Contact mobile phone' },
] as const

export type ImportTargetField = (typeof IMPORT_TARGETS)[number]['value']
export type ImportMapping = Record<string, ImportTargetField | null>
export type CsvRow = Record<string, string>

export type ParsedCustomerCsv =
  | { headers: string[]; rows: CsvRow[]; error: null }
  | { headers: []; rows: []; error: string }

export function parseCustomerCsv(text: string): ParsedCustomerCsv {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })
  const headers = parsed.meta.fields?.filter(Boolean) ?? []

  if (headers.length === 0)
    return { headers: [], rows: [], error: 'The CSV needs a header row.' }
  if (parsed.errors.length > 0)
    return {
      headers: [],
      rows: [],
      error: parsed.errors[0]?.message ?? 'The CSV could not be parsed.',
    }

  const rows = parsed.data.map((row) =>
    Object.fromEntries(
      headers.map((header) => [
        header,
        typeof row[header] === 'string' ? row[header] : '',
      ])
    )
  )
  if (rows.length === 0)
    return { headers: [], rows: [], error: 'The CSV has no data rows.' }
  if (rows.length > 2_000)
    return {
      headers: [],
      rows: [],
      error: 'The CSV can contain at most 2,000 data rows.',
    }

  return { headers, rows, error: null }
}

const ALIASES: Record<string, ImportTargetField> = {
  name: 'name',
  displayname: 'name',
  customername: 'name',
  fullname: 'name',
  kind: 'customerKind',
  customerkind: 'customerKind',
  customertype: 'customerKind',
  salutation: 'salutation',
  title: 'salutation',
  firstname: 'firstName',
  givenname: 'firstName',
  lastname: 'lastName',
  surname: 'lastName',
  familyname: 'lastName',
  company: 'companyName',
  companyname: 'companyName',
  businessname: 'companyName',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  mobilephone: 'phone',
  telephone: 'phone',
  workphone: 'workPhone',
  officephone: 'workPhone',
  customernumber: 'customerNumber',
  customerno: 'customerNumber',
  accountnumber: 'customerNumber',
  website: 'website',
  url: 'website',
  trn: 'taxRegistrationNumber',
  taxid: 'taxRegistrationNumber',
  taxnumber: 'taxRegistrationNumber',
  taxregistrationnumber: 'taxRegistrationNumber',
  notes: 'notes',
  note: 'notes',
  currency: 'currency',
  currencycode: 'currency',
  language: 'language',
  locale: 'language',
}

const ADDRESS_PART_ALIASES = {
  label: ['label'],
  attention: ['attention', 'attn'],
  line1: ['line1', 'address', 'street', 'addressline1'],
  line2: ['line2', 'addressline2'],
  city: ['city', 'town'],
  state: ['state', 'province', 'parish'],
  postalCode: ['postalcode', 'postcode', 'zipcode', 'zip'],
  countryCode: ['countrycode', 'country'],
} as const

for (const addressType of ['billingAddress', 'shippingAddress'] as const) {
  const prefix = addressType === 'billingAddress' ? 'billing' : 'shipping'

  for (const [part, aliases] of Object.entries(ADDRESS_PART_ALIASES)) {
    for (const alias of aliases)
      ALIASES[`${prefix}${alias}`] =
        `${addressType}.${part}` as ImportTargetField
  }
}

const CONTACT_PART_ALIASES = {
  salutation: ['contactsalutation', 'primarycontactsalutation'],
  firstName: ['contactfirstname', 'primarycontactfirstname'],
  lastName: ['contactlastname', 'primarycontactlastname'],
  email: ['contactemail', 'primarycontactemail'],
  workPhone: ['contactworkphone', 'primarycontactworkphone'],
  mobilePhone: ['contactmobile', 'contactmobilephone', 'primarycontactmobile'],
} as const

for (const [part, aliases] of Object.entries(CONTACT_PART_ALIASES)) {
  for (const alias of aliases)
    ALIASES[alias] = `contact.${part}` as ImportTargetField
}

export function normalizeImportHeader(header: string): string {
  return header
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function autoMapHeaders(headers: string[]): ImportMapping {
  const mapping: ImportMapping = {}
  const usedTargets = new Set<ImportTargetField>()

  for (const header of headers) {
    const target = ALIASES[normalizeImportHeader(header)] ?? null

    if (target === null || usedTargets.has(target)) {
      mapping[header] = null
      continue
    }

    mapping[header] = target
    usedTargets.add(target)
  }

  return mapping
}

export function ignoredHeaders(
  headers: string[],
  mapping: ImportMapping
): string[] {
  return headers.filter((header) => mapping[header] == null)
}

export function buildImportRows(
  rows: CsvRow[],
  mapping: ImportMapping
): CustomerImportRow[] {
  return rows.map((row, index) => buildImportRow(row, mapping, index + 2))
}

function buildImportRow(
  row: CsvRow,
  mapping: ImportMapping,
  rowNumber: number
): CustomerImportRow {
  const value = (target: ImportTargetField) => mappedValue(row, mapping, target)
  const customerKindValue = value('customerKind')?.toLowerCase()
  const customerKind =
    customerKindValue === 'business' || customerKindValue === 'company'
      ? 'BUSINESS'
      : customerKindValue === 'individual' || customerKindValue === 'person'
        ? 'INDIVIDUAL'
        : undefined
  const billingAddress = buildAddress(row, mapping, 'billingAddress')
  const shippingAddress = buildAddress(row, mapping, 'shippingAddress')
  const contact = buildContact(row, mapping)

  return compact({
    rowNumber,
    name: value('name') ?? '',
    customerKind,
    salutation: value('salutation'),
    firstName: value('firstName'),
    lastName: value('lastName'),
    companyName: value('companyName'),
    email: value('email'),
    phone: value('phone'),
    workPhone: value('workPhone'),
    customerNumber: value('customerNumber'),
    website: value('website'),
    notes: value('notes'),
    taxRegistrationNumber: value('taxRegistrationNumber'),
    currency: value('currency')?.toUpperCase(),
    language: value('language'),
    billingAddress,
    shippingAddress,
    contact,
  }) as CustomerImportRow
}

function mappedValue(
  row: CsvRow,
  mapping: ImportMapping,
  target: ImportTargetField
): string | undefined {
  const header = Object.keys(mapping).find((key) => mapping[key] === target)
  if (!header) return undefined

  const value = row[header]?.trim()
  return value || undefined
}

function buildAddress(
  row: CsvRow,
  mapping: ImportMapping,
  prefix: 'billingAddress' | 'shippingAddress'
) {
  const address = compact({
    label: mappedValue(row, mapping, `${prefix}.label`),
    attention: mappedValue(row, mapping, `${prefix}.attention`),
    line1: mappedValue(row, mapping, `${prefix}.line1`),
    line2: mappedValue(row, mapping, `${prefix}.line2`),
    city: mappedValue(row, mapping, `${prefix}.city`),
    state: mappedValue(row, mapping, `${prefix}.state`),
    postalCode: mappedValue(row, mapping, `${prefix}.postalCode`),
    countryCode: mappedValue(
      row,
      mapping,
      `${prefix}.countryCode`
    )?.toUpperCase(),
  })

  return Object.keys(address).length > 0 ? address : undefined
}

function buildContact(row: CsvRow, mapping: ImportMapping) {
  const contact = compact({
    salutation: mappedValue(row, mapping, 'contact.salutation'),
    firstName: mappedValue(row, mapping, 'contact.firstName'),
    lastName: mappedValue(row, mapping, 'contact.lastName'),
    email: mappedValue(row, mapping, 'contact.email'),
    workPhone: mappedValue(row, mapping, 'contact.workPhone'),
    mobilePhone: mappedValue(row, mapping, 'contact.mobilePhone'),
  })

  return Object.keys(contact).length > 0 ? contact : undefined
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Partial<T>
}

export function chunkRows<T>(rows: T[], size = 500): T[][] {
  if (!Number.isInteger(size) || size < 1)
    throw new Error('Chunk size must be a positive integer.')

  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size)
    chunks.push(rows.slice(index, index + size))

  return chunks
}

export function buildFailedRowsCsv(
  headers: string[],
  rows: CsvRow[],
  results: BillingCustomerImportRowResult[]
): string {
  const failed = results.filter(
    (result) => result.action === 'failed' || result.error !== null
  )
  const csvRows = [headers.concat('Error')]

  for (const result of failed) {
    const row = rows[result.rowNumber - 2] ?? {}
    csvRows.push(
      headers
        .map((header) => row[header] ?? '')
        .concat(result.error?.message ?? 'Import failed.')
    )
  }

  return csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
