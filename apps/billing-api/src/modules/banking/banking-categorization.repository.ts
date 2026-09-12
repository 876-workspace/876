import { prisma } from '@/db/client'

export type UncategorizeResult =
  | { kind: 'ok'; bankTransactionId: string }
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'in-use' }

export function uncategorizeManualStatementLineRow(
  tenantId: string,
  lineId: string,
  now: number
): Promise<UncategorizeResult> {
  return prisma.$transaction(
    async (tx) => {
      const line = await tx.bankStatementLine.findFirst({
        where: { tenantId, id: lineId, status: 'CATEGORIZED' },
        include: {
          matches: {
            where: { status: 'ACTIVE' },
            include: { items: true },
          },
        },
      })
      if (!line) return { kind: 'missing' as const }
      if (line.matches.length !== 1 || line.matches[0]?.items.length !== 1)
        return { kind: 'invalid' as const }

      const match = line.matches[0]
      const item = match.items[0]
      if (!item) return { kind: 'invalid' as const }

      const transaction = await tx.bankTransaction.findFirst({
        where: {
          tenantId,
          id: item.bankTransactionId,
          accountId: line.accountId,
          paymentId: null,
          transferId: null,
          depositId: null,
          status: 'CATEGORIZED',
        },
        include: {
          _count: {
            select: {
              reconciliationItems: true,
              depositSourceItems: true,
              statementMatchItems: true,
            },
          },
        },
      })
      if (!transaction || transaction._count.statementMatchItems !== 1)
        return { kind: 'invalid' as const }
      if (
        transaction._count.reconciliationItems > 0 ||
        transaction._count.depositSourceItems > 0
      )
        return { kind: 'in-use' as const }

      // Deleting the match cascades its item, releasing the restrictive FK on
      // the Banking-created transaction. This is deliberately different from
      // unmatch(), which preserves a pre-existing canonical transaction.
      await tx.bankStatementMatch.delete({ where: { id: match.id } })
      await tx.bankTransaction.delete({ where: { id: transaction.id } })
      await tx.bankStatementLine.update({
        where: { id: line.id },
        data: {
          status: 'UNCATEGORIZED',
          recognitionSource: null,
          recognizedRuleId: null,
          updatedAt: now,
        },
      })

      return { kind: 'ok' as const, bankTransactionId: transaction.id }
    },
    { isolationLevel: 'Serializable' }
  )
}
