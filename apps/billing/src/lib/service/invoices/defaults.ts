import { prisma } from '@/lib/db'

/**
 * Resolves invoice defaults once so every creation path snapshots the same
 * customer identity, addresses, notes, terms, and tax behavior.
 */
export async function resolveInvoiceDefaults(
  tenantId: string,
  customerId: string
) {
  const [customer, preference, documentPreference] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, tenantId, status: 'ACTIVE' },
      include: {
        addresses: {
          where: { type: { in: ['billing', 'shipping'] } },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }),
    prisma.invoicePreference.findUnique({ where: { tenantId } }),
    prisma.documentPreference.findUnique({
      where: {
        tenantId_documentType: { tenantId, documentType: 'INVOICE' },
      },
    }),
  ])
  if (!customer || !preference) return null

  const billingAddress =
    customer.addresses.find((address) => address.type === 'billing') ?? null
  const shippingAddress =
    customer.addresses.find((address) => address.type === 'shipping') ?? null

  return {
    customer,
    taxBehavior: customer.taxBehaviorOverride ?? preference.defaultTaxBehavior,
    notes:
      customer.invoiceNotes ??
      preference.defaultNotes ??
      documentPreference?.customerNote ??
      null,
    terms:
      customer.invoiceTerms ??
      preference.defaultTerms ??
      documentPreference?.termsAndConditions ??
      null,
    billingAddressSnapshot: toAddressSnapshot(billingAddress),
    shippingAddressSnapshot: toAddressSnapshot(shippingAddress),
  }
}

function toAddressSnapshot(
  address: {
    label: string | null
    attention: string | null
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    countryCode: string | null
  } | null
) {
  if (!address) return null

  return {
    label: address.label,
    attention: address.attention,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  }
}
