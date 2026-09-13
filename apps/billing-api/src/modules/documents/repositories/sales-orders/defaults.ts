import { prisma } from '@/db/client'

export async function resolveSalesOrderDefaults(
  tenantId: string,
  customerId: string,
  salespersonId?: string | null
) {
  const [customer, tenant, invoicePreference, documentPreference, salesperson] =
    await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, tenantId, status: 'ACTIVE' },
        include: {
          addresses: {
            where: { type: { in: ['billing', 'shipping'] } },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { defaultCurrency: true },
      }),
      prisma.invoicePreference.findUnique({ where: { tenantId } }),
      prisma.documentPreference.findUnique({
        where: {
          tenantId_documentType: { tenantId, documentType: 'SALES_ORDER' },
        },
      }),
      salespersonId
        ? prisma.salesperson.findFirst({
            where: { id: salespersonId, tenantId, isActive: true },
            select: { id: true, name: true },
          })
        : null,
    ])

  if (!customer || !tenant) return null

  const billingAddress =
    customer.addresses.find((address) => address.type === 'billing') ?? null
  const shippingAddress =
    customer.addresses.find((address) => address.type === 'shipping') ?? null

  return {
    customer,
    tenant,
    salesperson,
    taxBehavior:
      customer.taxBehaviorOverride ??
      invoicePreference?.defaultTaxBehavior ??
      ('EXCLUSIVE' as const),
    notes:
      customer.invoiceNotes ??
      invoicePreference?.defaultNotes ??
      documentPreference?.customerNote ??
      null,
    terms:
      customer.invoiceTerms ??
      invoicePreference?.defaultTerms ??
      documentPreference?.termsAndConditions ??
      null,
    billingAddressSnapshot: toAddressSnapshot(billingAddress),
    shippingAddressSnapshot: toAddressSnapshot(shippingAddress),
  }
}

export function addressSnapshot(
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
  return toAddressSnapshot(address)
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
