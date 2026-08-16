import type { Contact, Customer, CustomerLedgerEntry } from '@/db'

export function serializeContact(row: Contact) {
  return {
    object: 'contact' as const,
    id: row.id,
    userId: row.userId,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    workPhone: row.workPhone,
    mobilePhone: row.mobilePhone,
    isPrimary: row.isPrimary,
    coreSyncedAt: row.coreSyncedAt,
  }
}

export function serializeCustomer(row: Customer & { contacts?: Contact[] }) {
  return {
    object: 'customer' as const,
    id: row.id,
    sourceAppId: row.sourceAppId,
    sourceExternalReference: row.sourceExternalReference,
    customerType: row.customerType,
    customerKind: row.customerKind,
    organizationId: row.organizationId,
    userId: row.userId,
    externalReference: row.externalReference,
    customerNumber: row.customerNumber,
    name: row.name,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    workPhone: row.workPhone,
    website: row.website,
    notes: row.notes,
    taxRegistrationNumber: row.taxRegistrationNumber,
    billingAddress: row.billingAddress,
    metadata: row.metadata,
    defaultCurrency: row.defaultCurrency,
    language: row.language,
    paymentTermId: row.paymentTermId,
    salespersonId: row.salespersonId,
    priceListId: row.priceListId,
    consolidatedBillingOverride: row.consolidatedBillingOverride,
    taxBehaviorOverride: row.taxBehaviorOverride,
    lateFeeExempt: row.lateFeeExempt,
    invoiceNotes: row.invoiceNotes,
    invoiceTerms: row.invoiceTerms,
    outstandingReceivable: row.outstandingReceivable.toString(),
    unusedCredits: row.unusedCredits.toString(),
    coreSyncedAt: row.coreSyncedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    primaryContact: row.contacts?.[0]
      ? serializeContact(row.contacts[0])
      : null,
  }
}

/**
 * A customer plus the activity counts a detail view renders. Kept separate
 * from {@link serializeCustomer} so a list never pays for three aggregates it
 * does not display.
 */
export function serializeCustomerDetail(
  row: Customer & {
    contacts?: Contact[]
    _count: { subscriptions: number; invoices: number; quotes: number }
  }
) {
  return {
    ...serializeCustomer(row),
    counts: {
      subscriptions: row._count.subscriptions,
      invoices: row._count.invoices,
      quotes: row._count.quotes,
    },
  }
}

export function serializeLedgerEntry(row: CustomerLedgerEntry) {
  return {
    object: 'customer_ledger_entry' as const,
    id: row.id,
    customerId: row.customerId,
    subscriptionId: row.subscriptionId,
    invoiceId: row.invoiceId,
    paymentId: row.paymentId,
    creditNoteId: row.creditNoteId,
    refundId: row.refundId,
    type: row.type,
    direction: row.direction,
    amount: row.amount.toString(),
    currency: row.currency,
    description: row.description,
    effectiveAt: row.effectiveAt,
    createdAt: row.createdAt,
  }
}
