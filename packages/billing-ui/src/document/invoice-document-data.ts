import type { InvoiceDetail } from '@876/billing'
import type { PlatformOrganization } from '@876/core/platform'
import type {
  InvoiceDocumentPanelProps,
  InvoiceDocumentSeller,
} from '../panels/invoice-document-panel'

type Amounts =
  | 'subtotalAmount'
  | 'taxAmount'
  | 'discountAmount'
  | 'shippingAmount'
  | 'adjustmentAmount'
  | 'totalAmount'
  | 'amountDue'
  | 'amountPaid'
  | 'amountCredited'
type DocumentData = Omit<InvoiceDetail, Amounts | 'lines'> &
  Record<Amounts, string | bigint> & {
    lines: Array<
      Omit<
        InvoiceDetail['lines'][number],
        'unitAmount' | 'taxAmount' | 'discountAmount' | 'totalAmount'
      > & {
        unitAmount: string | bigint
        taxAmount: string | bigint
        discountAmount: string | bigint
        totalAmount: string | bigint
      }
    >
  }

/** Presentation adapter shared by hosts with JSON strings or hydrated minor units. */
export function invoiceDocumentData(
  invoice: DocumentData,
  formatDate: (value: number | null) => string,
  formatMoney: (amount: string | bigint, currency: string) => string
): Omit<InvoiceDocumentPanelProps, 'seller' | 'footer'> {
  const money = (value: string | bigint) => formatMoney(value, invoice.currency)
  const positive = (value: string | bigint) =>
    BigInt(value) > 0n ? money(value) : null
  const period = (start: number | null, end: number | null) =>
    start || end ? `${formatDate(start)} – ${formatDate(end)}` : null
  return {
    recipient: {
      name:
        invoice.customerName ??
        invoice.customer.companyName ??
        invoice.customer.name,
      email: invoice.customerEmail ?? invoice.customer.email,
      phone: invoice.customer.phone,
      address:
        addressSnapshot(invoice.billingAddressSnapshot) ??
        invoice.customer.addresses[0] ??
        null,
    },
    meta: [
      { label: 'Invoice date', value: formatDate(invoice.issueAt) },
      { label: 'Due date', value: formatDate(invoice.dueAt) },
      { label: 'Order number', value: invoice.orderNumber },
      { label: 'Reference', value: invoice.referenceNumber },
      {
        label: 'Tax display',
        value:
          invoice.taxBehavior === 'INCLUSIVE'
            ? 'Tax inclusive'
            : 'Tax exclusive',
      },
      { label: 'Payment terms', value: invoice.paymentTermName },
      { label: 'Salesperson', value: invoice.salespersonName },
      {
        label: 'Service period',
        value: period(invoice.servicePeriodStart, invoice.servicePeriodEnd),
      },
    ],
    invoice: {
      number: invoice.number,
      status: invoice.status,
      subject: invoice.subject,
      notes: invoice.notes,
      terms: invoice.terms,
      subtotalAmount: money(invoice.subtotalAmount),
      taxAmount: money(invoice.taxAmount),
      discountAmount: positive(invoice.discountAmount),
      shippingAmount: positive(invoice.shippingAmount),
      adjustmentAmount:
        BigInt(invoice.adjustmentAmount) !== 0n
          ? money(invoice.adjustmentAmount)
          : null,
      totalAmount: money(invoice.totalAmount),
      amountDue: money(invoice.amountDue),
      amountPaid: positive(invoice.amountPaid),
      amountCredited: positive(invoice.amountCredited),
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        servicePeriod: period(line.servicePeriodStart, line.servicePeriodEnd),
        unitAmount: money(line.unitAmount),
        taxAmount: positive(line.taxAmount),
        discountAmount: positive(line.discountAmount),
        totalAmount: money(line.totalAmount),
      })),
    },
  }
}

/**
 * The issuing organization's block on a printed document. Both hosts resolve
 * their organization row and pass it here, so the seller side of the document
 * cannot drift between Billing and Invoice.
 */
export function invoiceSeller(
  organization: Pick<
    PlatformOrganization,
    | 'name'
    | 'logo_url'
    | 'country_code'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'primary_email'
    | 'primary_phone'
  >,
  fallbackName: string
): InvoiceDocumentSeller {
  const country = countryName(organization.country_code)
  return {
    name: organization.name ?? fallbackName,
    countryLabel: country,
    logoUrl: organization.logo_url,
    email: organization.primary_email,
    phone: organization.primary_phone,
    address: {
      line1: organization.address_line1,
      line2: organization.address_line2,
      city: organization.city,
      countryLabel: country,
    },
  }
}

/** ISO 3166-1 alpha-2 to a display name, falling back to the code itself. */
function countryName(countryCode: string | null): string | null {
  if (!countryCode) return null
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ??
      countryCode
    )
  } catch {
    return countryCode
  }
}

function addressSnapshot(
  value: unknown
): InvoiceDocumentPanelProps['recipient']['address'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const read = (key: string) =>
    typeof record[key] === 'string' ? record[key] : null
  return {
    attention: read('attention'),
    line1: read('line1'),
    line2: read('line2'),
    city: read('city'),
    state: read('state'),
    postalCode: read('postalCode'),
    countryCode: read('countryCode'),
  }
}
