import { prisma } from '@/db/client'

/** Retrieves an invoice with its customer and lines. */
export async function retrieve(
  tenantId: string,
  invoiceId: string,
  sourceAppId?: string
) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId, ...(sourceAppId ? { sourceAppId } : {}) },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
      },
      lines: true,
      allocations: {
        where: { reversedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
          payment: {
            select: {
              id: true,
              number: true,
              paymentDate: true,
              currency: true,
              referenceNumber: true,
              status: true,
              paymentMode: { select: { id: true, name: true } },
            },
          },
        },
      },
      creditNoteAllocations: {
        where: { reversedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
          creditNote: {
            select: {
              id: true,
              number: true,
              issueAt: true,
              currency: true,
            },
          },
        },
      },
      lateFeeAssessment: {
        include: { sourceInvoice: { select: { id: true, number: true } } },
      },
      lateFeeAssessments: {
        include: {
          lateFeeInvoice: { select: { id: true, number: true, status: true } },
        },
      },
    },
  })
}
