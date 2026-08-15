import { prisma } from '@/db/client'

const PREFIX_BY_TYPE = {
  QUOTE: 'Q',
  INVOICE: 'INV',
  ESTIMATE: 'EST',
  PAYMENT: 'PAY',
  CREDIT_NOTE: 'CN',
  REFUND: 'REF',
} as const
export async function nextDocumentNumber(
  tenantId: string,
  documentType: keyof typeof PREFIX_BY_TYPE,
  now: number,
  client: Pick<typeof prisma, 'documentSequence'> = prisma
): Promise<string> {
  const sequence = await client.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId, documentType } },
    create: {
      tenantId,
      documentType,
      nextNumber: 2,
      createdAt: now,
      updatedAt: now,
    },
    update: { nextNumber: { increment: 1 }, updatedAt: now },
    select: { nextNumber: true },
  })
  return `${PREFIX_BY_TYPE[documentType]}-${String(sequence.nextNumber - 1).padStart(6, '0')}`
}
