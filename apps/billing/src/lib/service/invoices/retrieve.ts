import { prisma } from '@/lib/db'

/** Retrieves an invoice with its customer and lines. */
export async function retrieve(tenantId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
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
