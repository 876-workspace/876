import { z } from 'zod'

/**
 * Customer-facing financial documents that carry a PDF/print template.
 * Values are 876-owned symbolic identifiers, so they are kebab-case.
 */
export const DOCUMENT_TEMPLATE_TYPES = [
  'invoice',
  'quote',
  'sales-receipt',
  'credit-note',
  'payment-receipt',
] as const

export type DocumentTemplateType = (typeof DOCUMENT_TEMPLATE_TYPES)[number]

export const documentTemplateTypeSchema = z.enum(DOCUMENT_TEMPLATE_TYPES)

export const DOCUMENT_TEMPLATE_LAYOUT_KEYS = [
  'standard',
  'european',
  'spreadsheet',
  'elegant',
  'retail',
] as const

export type DocumentTemplateLayoutKey =
  (typeof DOCUMENT_TEMPLATE_LAYOUT_KEYS)[number]

export const documentTemplateLayoutKeySchema = z.enum(
  DOCUMENT_TEMPLATE_LAYOUT_KEYS
)

const HEX_COLOR = /^#[0-9a-f]{6}$/

/** Lowercase `#rrggbb`. Shorthand and named colors are rejected so stored values compare byte-for-byte. */
export const hexColorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(HEX_COLOR, 'Use a six-digit hex color such as #1f6feb.')

/**
 * Opaque 876 Storage file id (`file_…`). A template references uploaded
 * images by id only; a rendered URL is resolved by the host at read time.
 */
export const templateFileIdSchema = z
  .string()
  .regex(/^file_[A-Za-z0-9]+$/, 'Must be an 876 Storage file id.')

const labelSchema = z.string().trim().max(60)

/**
 * Free text with `%placeholder%` tokens. Plain text only: templates never
 * accept HTML or CSS, because the rendered document is shown inside the app
 * and to the organization's customers.
 */
const contentSchema = z.string().max(2000)

const fontSizeSchema = z.number().int().min(6).max(36)

export const DOCUMENT_TEMPLATE_FONTS = [
  'inter',
  'roboto',
  'open-sans',
  'lato',
  'noto-sans',
  'merriweather',
  'source-serif',
  'ubuntu-mono',
] as const

export const PAPER_SIZES = ['a4', 'letter', 'receipt-80mm'] as const
export const ORIENTATIONS = ['portrait', 'landscape'] as const
export const IMAGE_POSITIONS = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'tile',
] as const

const textStyleSchema = z.strictObject({
  fontSize: fontSizeSchema,
  fontColor: hexColorSchema,
})

const blockStyleSchema = textStyleSchema.extend({
  backgroundColor: hexColorSchema.nullable(),
})

export const generalSectionSchema = z.strictObject({
  paperSize: z.enum(PAPER_SIZES),
  orientation: z.enum(ORIENTATIONS),
  /** Inches. Layout geometry, never money, so numbers are safe here. */
  margins: z.strictObject({
    top: z.number().min(0).max(2),
    bottom: z.number().min(0).max(2),
    left: z.number().min(0).max(2),
    right: z.number().min(0).max(2),
  }),
  fontFamily: z.enum(DOCUMENT_TEMPLATE_FONTS),
  fontSize: fontSizeSchema,
  fontColor: hexColorSchema,
  labelColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  backgroundImageFileId: templateFileIdSchema.nullable(),
  backgroundImagePosition: z.enum(IMAGE_POSITIONS),
  /** `null` follows the organization's brand accent color. */
  accentColor: hexColorSchema.nullable(),
  /** Invoice only: a detachable remittance section at the foot of the page. */
  includePaymentStub: z.boolean(),
})

export const headerSectionSchema = blockStyleSchema.extend({
  show: z.boolean(),
  backgroundImageFileId: templateFileIdSchema.nullable(),
  content: contentSchema,
  firstPageOnly: z.boolean(),
})

export const footerSectionSchema = blockStyleSchema.extend({
  show: z.boolean(),
  backgroundImageFileId: templateFileIdSchema.nullable(),
  content: contentSchema,
  showPageNumber: z.boolean(),
})

export const organizationSectionSchema = z.strictObject({
  showLogo: z.boolean(),
  /** Rendered logo height in pixels. */
  logoHeight: z.number().int().min(24).max(240),
  showName: z.boolean(),
  name: textStyleSchema,
  showAddress: z.boolean(),
  addressFormat: contentSchema,
})

export const customerSectionSchema = z.strictObject({
  name: textStyleSchema,
  showBillTo: z.boolean(),
  billToLabel: labelSchema,
  billingAddressFormat: contentSchema,
  showShipTo: z.boolean(),
  shipToLabel: labelSchema,
  shippingAddressFormat: contentSchema,
})

export const DOCUMENT_DETAIL_FIELD_KEYS = [
  'number',
  'date',
  'due-date',
  'expiry-date',
  'terms',
  'reference',
  'salesperson',
  'subject',
  'payment-mode',
] as const

export type DocumentDetailFieldKey = (typeof DOCUMENT_DETAIL_FIELD_KEYS)[number]

const toggleableFieldSchema = <TKey extends string>(
  keys: readonly [TKey, ...TKey[]]
) =>
  z.strictObject({
    key: z.enum(keys),
    show: z.boolean(),
    label: labelSchema,
  })

export const documentDetailsSectionSchema = z.strictObject({
  showTitle: z.boolean(),
  title: labelSchema,
  titleStyle: textStyleSchema,
  fields: z.array(toggleableFieldSchema(DOCUMENT_DETAIL_FIELD_KEYS)).max(20),
})

export const TABLE_COLUMN_KEYS = [
  'line-number',
  'item',
  'quantity',
  'unit',
  'rate',
  'discount',
  'tax',
  'amount',
] as const

export type TableColumnKey = (typeof TABLE_COLUMN_KEYS)[number]

export const tableSectionSchema = z.strictObject({
  columns: z
    .array(
      toggleableFieldSchema(TABLE_COLUMN_KEYS).extend({
        /** Share of the table width; `null` lets the layout size the column. */
        widthPercent: z.number().int().min(4).max(80).nullable(),
      })
    )
    .max(20),
  showItemDescription: z.boolean(),
  showBorders: z.boolean(),
  header: blockStyleSchema,
  row: blockStyleSchema,
  description: textStyleSchema,
})

export const totalsSectionSchema = z.strictObject({
  show: z.boolean(),
  showPaymentDetails: z.boolean(),
  showAmountInWords: z.boolean(),
  showCurrencySymbol: z.boolean(),
  showQuantityTotal: z.boolean(),
  showTaxSummary: z.boolean(),
  subtotalLabel: labelSchema,
  totalLabel: labelSchema,
  balanceDueLabel: labelSchema,
  totalStyle: blockStyleSchema,
  balanceDueStyle: blockStyleSchema,
})

const labelledBlockSchema = z.strictObject({
  show: z.boolean(),
  label: labelSchema,
  fontSize: fontSizeSchema,
})

export const otherDetailsSectionSchema = z.strictObject({
  notes: labelledBlockSchema,
  terms: labelledBlockSchema,
  showPaymentOptions: z.boolean(),
  showBankDetails: z.boolean(),
  showQrCode: z.boolean(),
  signature: z.strictObject({
    show: z.boolean(),
    label: labelSchema,
    imageFileId: templateFileIdSchema.nullable(),
  }),
})

/** The fully resolved template a renderer consumes. Every field is present. */
export const documentTemplateSettingsSchema = z.strictObject({
  general: generalSectionSchema,
  header: headerSectionSchema,
  footer: footerSectionSchema,
  organization: organizationSectionSchema,
  customer: customerSectionSchema,
  documentDetails: documentDetailsSectionSchema,
  table: tableSectionSchema,
  totals: totalsSectionSchema,
  otherDetails: otherDetailsSectionSchema,
})

export type DocumentTemplateSettings = z.infer<
  typeof documentTemplateSettingsSchema
>

export const DOCUMENT_TEMPLATE_SECTION_KEYS = Object.keys(
  documentTemplateSettingsSchema.shape
) as (keyof DocumentTemplateSettings)[]

/**
 * What is persisted: only sections/fields that differ from the layout default.
 * Each section is a partial of its resolved shape; arrays are replaced
 * wholesale per section and merged by `key` at resolution.
 */
export const documentTemplateOverridesSchema = z.strictObject({
  general: generalSectionSchema.partial().optional(),
  header: headerSectionSchema.partial().optional(),
  footer: footerSectionSchema.partial().optional(),
  organization: organizationSectionSchema.partial().optional(),
  customer: customerSectionSchema.partial().optional(),
  documentDetails: documentDetailsSectionSchema.partial().optional(),
  table: tableSectionSchema.partial().optional(),
  totals: totalsSectionSchema.partial().optional(),
  otherDetails: otherDetailsSectionSchema.partial().optional(),
})

export type DocumentTemplateOverrides = z.infer<
  typeof documentTemplateOverridesSchema
>

export const DOCUMENT_TEMPLATE_SCHEMA_VERSION = 1
