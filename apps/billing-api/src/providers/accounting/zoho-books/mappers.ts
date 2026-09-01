import type {
  AccountingCustomerInput,
  AccountingDocumentLineInput,
  AccountingEstimateInput,
  AccountingInvoiceInput,
  AccountingItemInput,
  AccountingPaymentInput,
  AccountingRecurringInvoiceInput,
} from '../types'
import { ZohoBooksError } from './errors'
import type {
  ZohoContactInput,
  ZohoCustomerPaymentInput,
  ZohoEstimateInput,
  ZohoInvoiceInput,
  ZohoItemInput,
  ZohoLineItemInput,
  ZohoRecurringInvoiceInput,
} from './types'

function dateFromUnix(value: number | null | undefined): string | undefined {
  if (value == null) return undefined
  return new Date(value * 1000).toISOString().slice(0, 10)
}

function fractionDigits(currency: string) {
  try {
    // `maximumFractionDigits` is optional in the TS lib type; every ICU
    // implementation supplies it for a currency format, but fall back rather
    // than produce a NaN scaling factor if one does not.
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

export function minorUnitsToZohoNumber(amount: bigint, currency: string) {
  const digits = fractionDigits(currency)
  const factor = 10n ** BigInt(digits)
  const sign = amount < 0n ? -1 : 1
  const absolute = amount < 0n ? -amount : amount
  const whole = absolute / factor
  const fraction = (absolute % factor).toString().padStart(digits, '0')
  const value = Number(digits === 0 ? whole.toString() : `${whole}.${fraction}`)
  if (!Number.isFinite(value))
    throw new ZohoBooksError({
      code: 'billing/accounting-projection-invalid',
      retryable: false,
    })
  return sign * value
}

function recoveryField(resourceId: string) {
  return [{ label: '876 Resource ID', value: resourceId }]
}

export function toZohoContact(
  input: AccountingCustomerInput
): ZohoContactInput {
  return {
    contact_name: input.name,
    company_name: input.companyName ?? undefined,
    contact_type: 'customer',
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    custom_fields: recoveryField(input.id),
  }
}

export function toZohoItem(input: AccountingItemInput): ZohoItemInput {
  return {
    name: input.name,
    sku: input.sku ?? undefined,
    unit: input.unit ?? undefined,
    description: input.description ?? undefined,
    rate:
      input.amount != null && input.currency
        ? minorUnitsToZohoNumber(input.amount, input.currency)
        : undefined,
    product_type: input.type === 'GOOD' ? 'goods' : 'service',
    item_type: 'sales',
    is_taxable: input.isTaxable,
    custom_fields: recoveryField(input.id),
  }
}

function toZohoLine(line: AccountingDocumentLineInput): ZohoLineItemInput {
  return {
    item_id: line.providerItemId ?? undefined,
    description: line.description,
    quantity: line.quantity,
    rate: minorUnitsToZohoNumber(line.unitAmount, line.currency),
  }
}

export function toZohoEstimate(
  input: AccountingEstimateInput
): ZohoEstimateInput {
  return {
    customer_id: input.providerCustomerId,
    estimate_number: input.number,
    date: dateFromUnix(input.issueAt),
    expiry_date: dateFromUnix(input.expiresAt),
    line_items: input.lines.map(toZohoLine),
    notes: input.notes ?? undefined,
    terms: input.terms ?? undefined,
    custom_fields: recoveryField(input.id),
  }
}

export function toZohoInvoice(input: AccountingInvoiceInput): ZohoInvoiceInput {
  return {
    customer_id: input.providerCustomerId,
    invoice_number: input.number,
    date: dateFromUnix(input.issueAt),
    due_date: dateFromUnix(input.dueAt),
    reference_number: input.referenceNumber ?? undefined,
    line_items: input.lines.map(toZohoLine),
    notes: input.notes ?? undefined,
    terms: input.terms ?? undefined,
    custom_fields: recoveryField(input.id),
  }
}

const recurrenceFrequency = {
  DAY: 'days',
  WEEK: 'weeks',
  MONTH: 'months',
  YEAR: 'years',
} as const

export function toZohoRecurringInvoice(
  input: AccountingRecurringInvoiceInput
): ZohoRecurringInvoiceInput {
  return {
    customer_id: input.providerCustomerId,
    recurrence_name: input.name,
    start_date: dateFromUnix(input.startAt),
    end_date: dateFromUnix(input.endAt),
    recurrence_frequency: recurrenceFrequency[input.intervalUnit],
    repeat_every: input.intervalCount,
    line_items: input.lines.map(toZohoLine),
    custom_fields: recoveryField(input.id),
  }
}

export function toZohoCustomerPayment(
  input: AccountingPaymentInput
): ZohoCustomerPaymentInput {
  return {
    customer_id: input.providerCustomerId,
    payment_mode: input.paymentMode,
    amount: minorUnitsToZohoNumber(input.amount, input.currency),
    date: dateFromUnix(input.paidAt)!,
    reference_number: input.referenceNumber ?? undefined,
    description: input.notes ?? undefined,
    invoices: input.allocations.map((allocation) => ({
      invoice_id: allocation.providerInvoiceId,
      amount_applied: minorUnitsToZohoNumber(allocation.amount, input.currency),
    })),
    custom_fields: recoveryField(input.id),
  }
}
