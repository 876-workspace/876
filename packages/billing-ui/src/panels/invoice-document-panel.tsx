import type { ReactNode } from 'react'
import type { Branding } from '@876/core/branding'
import { DEFAULT_BRANDING } from '@876/core/branding'
import type {
  DocumentDetailFieldKey,
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
} from '@876/core/document-templates'
import {
  DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
  DOCUMENT_DETAIL_FIELD_KEYS,
  resolveDocumentTemplate,
} from '@876/core/document-templates'
import { cn } from '@876/ui/lib/utils'

import { TemplatedDocument } from '../documents/templated-document'
import type { TemplatedDocumentData } from '../documents/types'
import {
  documentStatusVariant,
  type DocumentStatusVariant,
} from '../document-status'

export interface InvoiceDocumentSeller {
  name: string
  countryLabel: string | null
  /** The organization's uploaded logo. The name alone renders when absent. */
  logoUrl?: string | null
  email?: string | null
  phone?: string | null
  address?: {
    line1: string | null
    line2: string | null
    city: string | null
    countryLabel: string | null
  } | null
}

export interface InvoiceDocumentPanelProps {
  seller: InvoiceDocumentSeller
  invoice: {
    number: string
    status: string
    subject: string | null
    subtotalAmount: string
    taxAmount: string
    discountAmount: string | null
    shippingAmount: string | null
    adjustmentAmount: string | null
    totalAmount: string
    amountCredited: string | null
    amountPaid: string | null
    amountDue: string
    notes: string | null
    terms: string | null
    lines: Array<{
      id: string
      description: string
      quantity: number
      servicePeriod: string | null
      unitAmount: string
      discountAmount: string | null
      taxAmount: string | null
      totalAmount: string
    }>
  }
  recipient: {
    name: string
    email: string | null
    phone: string | null
    address: {
      attention: string | null
      line1: string | null
      line2: string | null
      city: string | null
      state: string | null
      postalCode: string | null
      countryCode: string | null
    } | null
  }
  meta: Array<{ label: string; value: string | null }>
  footer: ReactNode
  template?: {
    layout: DocumentTemplateLayoutKey
    settings: DocumentTemplateSettings
  }
  branding?: Branding
}

/** Host meta labels that name a template detail field without using its exact label. */
const META_SYNONYMS: Record<string, DocumentDetailFieldKey> = {
  'invoice date': 'date',
  'due date': 'due-date',
  'expiry date': 'expiry-date',
  terms: 'terms',
  'payment terms': 'terms',
  reference: 'reference',
  salesperson: 'salesperson',
  subject: 'subject',
  'payment mode': 'payment-mode',
}

function normalizeMetaLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[#\s]+$/, '')
}

export function InvoiceDocumentPanel({
  seller,
  invoice,
  recipient,
  meta,
  footer,
  template,
  branding,
}: InvoiceDocumentPanelProps) {
  const resolved = template ?? {
    layout: DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
    settings: resolveDocumentTemplate(
      DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
      'invoice',
      {}
    ),
  }
  const settings: DocumentTemplateSettings = structuredClone(resolved.settings)

  const details: TemplatedDocumentData['details'] = {
    number: invoice.number,
    subject: invoice.subject,
  }
  const claimed = new Set<DocumentDetailFieldKey>(['number', 'subject'])
  // Keys the template does not already list, in canonical order, available
  // as carriers for host meta rows that name no template field.
  const carrierPool = DOCUMENT_DETAIL_FIELD_KEYS.filter(
    (key) => !claimed.has(key)
  )
  for (const entry of meta) {
    if (!entry.value) continue
    const synonym = META_SYNONYMS[normalizeMetaLabel(entry.label)]
    const useSynonym = synonym !== undefined && !claimed.has(synonym)
    const key = useSynonym
      ? synonym
      : carrierPool.find((candidate) => !claimed.has(candidate))
    if (!key) continue
    claimed.add(key)
    details[key] = entry.value
    const existing = settings.documentDetails.fields.find(
      (field) => field.key === key
    )
    if (existing) {
      // A synonym match keeps the template's own label; a carrier borrows
      // the host's label so the row still reads the way the host named it.
      if (!useSynonym) existing.label = entry.label
    } else {
      settings.documentDetails.fields.push({
        key,
        show: true,
        label: entry.label,
      })
    }
  }

  const showDiscountColumn = invoice.lines.some((line) =>
    Boolean(line.discountAmount)
  )
  const showTaxColumn = invoice.lines.some((line) => Boolean(line.taxAmount))
  // Today's behavior: discount/tax columns follow line data, not the template
  // flag. Force them visible when any line carries a value so the amounts
  // have a column, and hidden when no line does.
  settings.table.columns = settings.table.columns.map((column) =>
    column.key === 'discount'
      ? { ...column, show: showDiscountColumn }
      : column.key === 'tax'
        ? { ...column, show: showTaxColumn }
        : column
  )

  const address = recipient.address
  const document: TemplatedDocumentData = {
    seller: {
      name: seller.name,
      logoUrl: seller.logoUrl,
      email: seller.email,
      phone: seller.phone,
      address: seller.address
        ? {
            line1: seller.address.line1,
            line2: seller.address.line2,
            city: seller.address.city,
            state: null,
            postalCode: null,
            country: seller.address.countryLabel ?? seller.countryLabel,
          }
        : seller.countryLabel
          ? {
              line1: null,
              line2: null,
              city: null,
              state: null,
              postalCode: null,
              country: seller.countryLabel,
            }
          : null,
    },
    recipient: {
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone,
      billingAddress: address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.countryCode,
          }
        : null,
    },
    details,
    lines: invoice.lines.map((line) => ({
      id: line.id,
      name: line.description,
      description: line.servicePeriod,
      quantity: String(line.quantity),
      unit: null,
      rate: line.unitAmount,
      discount: line.discountAmount,
      tax: line.taxAmount,
      amount: line.totalAmount,
    })),
    totals: {
      subtotal: invoice.subtotalAmount,
      discount: invoice.discountAmount,
      shipping: invoice.shippingAmount,
      adjustment: invoice.adjustmentAmount,
      tax: invoice.taxAmount,
      total: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountCredited: invoice.amountCredited,
      balanceDue: invoice.amountDue,
      amountInWords: null,
    },
    taxSummary: [],
    notes: invoice.notes,
    terms: invoice.terms,
    paymentOptions: [],
    bankDetails: [],
    qrCodeUrl: null,
  }

  return (
    <div className="relative">
      <TemplatedDocument
        documentType="invoice"
        layout={resolved.layout}
        settings={settings}
        branding={branding ?? DEFAULT_BRANDING}
        document={document}
        status={<DocumentStatusRibbon status={invoice.status} />}
        footerSlot={footer}
      />
    </div>
  )
}

/**
 * Solid status colours for the corner ribbon. Keyed by the shared document
 * variant, so the ribbon can never disagree with the status badge elsewhere.
 */
const RIBBON_BACKGROUND: Record<DocumentStatusVariant, string> = {
  default: 'bg-muted-foreground',
  secondary: 'bg-muted-foreground',
  outline: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

/**
 * The diagonal status ribbon in the document's top-left corner. It replaces a
 * second status line inside the header, and the header carries `pt-16` so the
 * ribbon's band cannot reach the seller logo or name beneath it.
 */
function DocumentStatusRibbon({ status }: { status: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 size-24 overflow-hidden print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"
      data-document-ribbon={status}
    >
      <span
        className={cn(
          'absolute top-5 -left-10 w-36 -rotate-45 py-1 text-center text-[0.625rem] font-semibold tracking-wider text-white uppercase',
          RIBBON_BACKGROUND[documentStatusVariant(status)]
        )}
      >
        {status.toLowerCase().replaceAll('_', ' ')}
      </span>
    </div>
  )
}
