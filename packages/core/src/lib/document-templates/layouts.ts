import type {
  DocumentDetailFieldKey,
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
  DocumentTemplateType,
  TableColumnKey,
} from './schema'

export type DocumentTemplateCategory =
  'standard' | 'spreadsheet' | 'premium' | 'retail'

export interface DocumentTemplateLayout {
  key: DocumentTemplateLayoutKey
  label: string
  category: DocumentTemplateCategory
  /** Document types this layout may be selected for. */
  documentTypes: readonly DocumentTemplateType[]
}

const ALL_TYPES = [
  'invoice',
  'quote',
  'sales-receipt',
  'credit-note',
  'payment-receipt',
] as const satisfies readonly DocumentTemplateType[]

/**
 * The built-in layout gallery, modelled on the Zoho Finance template
 * categories (Standard, Spreadsheet, Premium, Retail). A layout fixes the
 * arrangement; every visual value on top of it is a template setting.
 */
export const DOCUMENT_TEMPLATE_LAYOUTS: readonly DocumentTemplateLayout[] = [
  {
    key: 'standard',
    label: 'Standard',
    category: 'standard',
    documentTypes: ALL_TYPES,
  },
  {
    key: 'european',
    label: 'European',
    category: 'standard',
    documentTypes: ALL_TYPES,
  },
  {
    key: 'spreadsheet',
    label: 'Spreadsheet',
    category: 'spreadsheet',
    documentTypes: ['invoice', 'quote', 'credit-note'],
  },
  {
    key: 'elegant',
    label: 'Elegant',
    category: 'premium',
    documentTypes: ['invoice', 'quote', 'credit-note'],
  },
  {
    key: 'retail',
    label: 'Retail receipt',
    category: 'retail',
    documentTypes: ['sales-receipt', 'payment-receipt'],
  },
]

export function findDocumentTemplateLayout(
  key: string
): DocumentTemplateLayout | undefined {
  return DOCUMENT_TEMPLATE_LAYOUTS.find((layout) => layout.key === key)
}

export function layoutSupportsDocumentType(
  layoutKey: DocumentTemplateLayoutKey,
  documentType: DocumentTemplateType
): boolean {
  return (
    findDocumentTemplateLayout(layoutKey)?.documentTypes.includes(
      documentType
    ) ?? false
  )
}

/** The layout every document type uses when an organization has not chosen a default template. */
export const DEFAULT_DOCUMENT_TEMPLATE_LAYOUT: DocumentTemplateLayoutKey =
  'standard'

export const DOCUMENT_TITLES: Record<DocumentTemplateType, string> = {
  invoice: 'Invoice',
  quote: 'Quote',
  'sales-receipt': 'Sales Receipt',
  'credit-note': 'Credit Note',
  'payment-receipt': 'Payment Receipt',
}

const DETAIL_FIELDS: Record<
  DocumentTemplateType,
  readonly [DocumentDetailFieldKey, string][]
> = {
  invoice: [
    ['number', 'Invoice#'],
    ['date', 'Invoice Date'],
    ['terms', 'Terms'],
    ['due-date', 'Due Date'],
    ['reference', 'Reference#'],
    ['salesperson', 'Salesperson'],
    ['subject', 'Subject'],
  ],
  quote: [
    ['number', 'Quote#'],
    ['date', 'Quote Date'],
    ['expiry-date', 'Expiry Date'],
    ['reference', 'Reference#'],
    ['salesperson', 'Salesperson'],
    ['subject', 'Subject'],
  ],
  'sales-receipt': [
    ['number', 'Receipt#'],
    ['date', 'Receipt Date'],
    ['payment-mode', 'Payment Mode'],
    ['reference', 'Reference#'],
    ['salesperson', 'Salesperson'],
  ],
  'credit-note': [
    ['number', 'Credit Note#'],
    ['date', 'Credit Date'],
    ['reference', 'Reference#'],
    ['subject', 'Subject'],
  ],
  'payment-receipt': [
    ['number', 'Payment#'],
    ['date', 'Payment Date'],
    ['payment-mode', 'Payment Mode'],
    ['reference', 'Reference#'],
  ],
}

const TABLE_COLUMNS: readonly [TableColumnKey, string, boolean][] = [
  ['line-number', '#', true],
  ['item', 'Item & Description', true],
  ['quantity', 'Qty', true],
  ['unit', 'Unit', false],
  ['rate', 'Rate', true],
  ['discount', 'Discount', false],
  ['tax', 'Tax', false],
  ['amount', 'Amount', true],
]

const DEFAULT_ADDRESS_FORMAT = [
  '%address.line1%',
  '%address.line2%',
  '%address.city% %address.state% %address.postalCode%',
  '%address.country%',
].join('\n')

const INK = '#1f2937'
const MUTED = '#6b7280'
const WHITE = '#ffffff'

function baseSettings(
  documentType: DocumentTemplateType
): DocumentTemplateSettings {
  return {
    general: {
      paperSize: 'a4',
      orientation: 'portrait',
      margins: { top: 0.7, bottom: 0.7, left: 0.55, right: 0.4 },
      fontFamily: 'inter',
      fontSize: 9,
      fontColor: INK,
      labelColor: MUTED,
      backgroundColor: WHITE,
      backgroundImageFileId: null,
      backgroundImagePosition: 'center',
      accentColor: null,
      includePaymentStub: false,
    },
    header: {
      show: false,
      fontSize: 8,
      fontColor: MUTED,
      backgroundColor: null,
      backgroundImageFileId: null,
      content: '',
      firstPageOnly: false,
    },
    footer: {
      show: true,
      fontSize: 6,
      fontColor: MUTED,
      backgroundColor: null,
      backgroundImageFileId: null,
      content: '',
      showPageNumber: true,
    },
    organization: {
      showLogo: true,
      logoHeight: 64,
      showName: true,
      name: { fontSize: 10, fontColor: INK },
      showAddress: true,
      addressFormat: DEFAULT_ADDRESS_FORMAT,
    },
    customer: {
      name: { fontSize: 9, fontColor: INK },
      showBillTo: true,
      billToLabel:
        documentType === 'payment-receipt' ? 'Received From' : 'Bill To',
      billingAddressFormat: DEFAULT_ADDRESS_FORMAT,
      showShipTo: false,
      shipToLabel: 'Ship To',
      shippingAddressFormat: DEFAULT_ADDRESS_FORMAT,
    },
    documentDetails: {
      showTitle: true,
      title: DOCUMENT_TITLES[documentType].toUpperCase(),
      titleStyle: { fontSize: 28, fontColor: INK },
      fields: DETAIL_FIELDS[documentType].map(([key, label]) => ({
        key,
        show: true,
        label,
      })),
    },
    table: {
      columns: TABLE_COLUMNS.map(([key, label, show]) => ({
        key,
        show,
        label,
        widthPercent: null,
      })),
      showItemDescription: true,
      showBorders: false,
      header: { fontSize: 9, fontColor: WHITE, backgroundColor: '#3c3d3a' },
      row: { fontSize: 9, fontColor: INK, backgroundColor: WHITE },
      description: { fontSize: 8, fontColor: MUTED },
    },
    totals: {
      show: true,
      showPaymentDetails: documentType === 'invoice',
      showAmountInWords: false,
      showCurrencySymbol: true,
      showQuantityTotal: false,
      showTaxSummary: false,
      subtotalLabel: 'Sub Total',
      totalLabel: 'Total',
      balanceDueLabel: 'Balance Due',
      totalStyle: { fontSize: 9, fontColor: INK, backgroundColor: WHITE },
      balanceDueStyle: {
        fontSize: 9,
        fontColor: INK,
        backgroundColor: '#f5f4f3',
      },
    },
    otherDetails: {
      notes: { show: true, label: 'Notes', fontSize: 8 },
      terms: { show: true, label: 'Terms & Conditions', fontSize: 8 },
      showPaymentOptions: documentType === 'invoice',
      showBankDetails: false,
      showQrCode: false,
      signature: {
        show: false,
        label: 'Authorized Signature',
        imageFileId: null,
      },
    },
  }
}

/**
 * Built-in defaults for one layout and document type. This is the value a
 * template resolves to when nothing is stored — defaults are never persisted.
 */
export function layoutDefaults(
  layoutKey: DocumentTemplateLayoutKey,
  documentType: DocumentTemplateType
): DocumentTemplateSettings {
  const settings = baseSettings(documentType)

  switch (layoutKey) {
    case 'standard':
      return settings
    case 'european':
      return {
        ...settings,
        documentDetails: {
          ...settings.documentDetails,
          titleStyle: { fontSize: 22, fontColor: INK },
        },
        table: {
          ...settings.table,
          header: { fontSize: 9, fontColor: INK, backgroundColor: '#f3f4f6' },
        },
      }
    case 'spreadsheet':
      return {
        ...settings,
        documentDetails: {
          ...settings.documentDetails,
          titleStyle: { fontSize: 18, fontColor: INK },
        },
        table: {
          ...settings.table,
          showBorders: true,
          header: { fontSize: 8, fontColor: INK, backgroundColor: '#e5e7eb' },
          row: { fontSize: 8, fontColor: INK, backgroundColor: WHITE },
        },
      }
    case 'elegant':
      return {
        ...settings,
        general: { ...settings.general, fontFamily: 'merriweather' },
        header: {
          ...settings.header,
          show: true,
          fontColor: WHITE,
          backgroundColor: '#1e293b',
        },
        documentDetails: {
          ...settings.documentDetails,
          titleStyle: { fontSize: 30, fontColor: '#1e293b' },
        },
        table: {
          ...settings.table,
          header: { fontSize: 9, fontColor: WHITE, backgroundColor: '#1e293b' },
        },
      }
    case 'retail':
      return {
        ...settings,
        general: {
          ...settings.general,
          paperSize: 'receipt-80mm',
          margins: { top: 0.2, bottom: 0.2, left: 0.15, right: 0.15 },
          fontFamily: 'ubuntu-mono',
          fontSize: 8,
        },
        organization: { ...settings.organization, logoHeight: 40 },
        documentDetails: {
          ...settings.documentDetails,
          titleStyle: { fontSize: 12, fontColor: INK },
        },
        table: {
          ...settings.table,
          columns: settings.table.columns.map((column) => ({
            ...column,
            show: ['item', 'quantity', 'amount'].includes(column.key),
          })),
          showItemDescription: false,
          header: { fontSize: 8, fontColor: INK, backgroundColor: null },
        },
        footer: { ...settings.footer, showPageNumber: false },
      }
  }
}
